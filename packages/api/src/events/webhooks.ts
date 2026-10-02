import {
  type WebhookDelivery as WebhookDeliveryValue,
  WebhookDelivery,
  WebhookConflict,
  WebhookInvalid,
  WebhookNotFound,
  WebhookSubscription,
  type WebhookSubscription as WebhookSubscriptionValue,
  type WebhookSubscriptionCreate,
  type WebhookSubscriptionCreated,
  type WebhookSubscriptionUpdate,
  type WebhookSecretRotated,
  WebhookUnavailable,
} from '@froment/contracts';
import {
  Clock,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Redacted,
  Random,
  Schedule,
  Schema,
} from 'effect';
import { createHmac, hkdfSync, randomBytes } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';

import { Database, DatabaseError, isSqliteError } from '../database/database.js';
import { RuntimeConfiguration } from '../runtime-config.js';
import { WebhookTransport } from './transport.js';

const SubscriptionRow = Schema.Struct({
  id: Schema.String,
  requestId: Schema.String,
  name: Schema.String,
  url: Schema.String,
  eventTypes: Schema.String,
  status: WebhookSubscription.fields.status,
  keyVersion: Schema.Int,
  version: Schema.Int,
  createdAt: Schema.Int,
  updatedAt: Schema.Int,
});
const DeliveryRow = Schema.Struct({
  id: Schema.String,
  eventId: Schema.String,
  subscriptionId: Schema.String,
  eventType: Schema.String,
  subject: Schema.String,
  status: WebhookDelivery.fields.status,
  attempts: Schema.Int,
  responseStatus: Schema.NullOr(Schema.Int),
  error: Schema.NullOr(Schema.String),
  createdAt: Schema.Int,
  nextAttemptAt: Schema.NullOr(Schema.Int),
  deliveredAt: Schema.NullOr(Schema.Int),
  replayOf: Schema.NullOr(Schema.String),
});
const DeliveryJob = Schema.Struct({
  id: Schema.String,
  eventId: Schema.String,
  subscriptionId: Schema.String,
  url: Schema.String,
  keyVersion: Schema.Int,
  content: Schema.String,
  attempts: Schema.Int,
  lease: Schema.Int,
});

const subscriptionSelect = `select id, request_id as requestId, name, url, event_types as eventTypes,
  status, key_version as keyVersion, version, created_at as createdAt, updated_at as updatedAt
  from webhook_subscriptions`;
const deliverySelect = `select d.id, d.event_id as eventId, d.subscription_id as subscriptionId,
  e.event_type as eventType, e.subject, d.status, d.attempts,
  d.response_status as responseStatus, d.error, d.created_at as createdAt,
  d.next_attempt_at as nextAttemptAt, d.delivered_at as deliveredAt, d.replay_of as replayOf
  from webhook_deliveries d join outbox_events e on e.id = d.event_id`;
const databaseFailure = (cause: unknown) => new DatabaseError({ operation: 'webhook', cause });
const iso = (value: number) => DateTime.formatIso(DateTime.makeUnsafe(value));

const mapSubscription = (row: typeof SubscriptionRow.Type): WebhookSubscriptionValue =>
  Schema.decodeUnknownSync(WebhookSubscription)({
    ...row,
    eventTypes: JSON.parse(row.eventTypes),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  });
const mapDelivery = (row: typeof DeliveryRow.Type): WebhookDeliveryValue =>
  Schema.decodeUnknownSync(WebhookDelivery)({
    ...row,
    createdAt: iso(row.createdAt),
    nextAttemptAt: row.nextAttemptAt === null ? null : iso(row.nextAttemptAt),
    deliveredAt: row.deliveredAt === null ? null : iso(row.deliveredAt),
  });

export interface WebhooksService {
  readonly listSubscriptions: Effect.Effect<ReadonlyArray<WebhookSubscriptionValue>, DatabaseError>;
  readonly createSubscription: (
    request: WebhookSubscriptionCreate,
    userId: string,
  ) => Effect.Effect<
    WebhookSubscriptionCreated,
    DatabaseError | WebhookConflict | WebhookInvalid | WebhookUnavailable
  >;
  readonly updateSubscription: (
    id: string,
    request: WebhookSubscriptionUpdate,
  ) => Effect.Effect<
    WebhookSubscriptionValue,
    DatabaseError | WebhookNotFound | WebhookConflict | WebhookInvalid
  >;
  readonly rotateSecret: (
    id: string,
    expectedVersion: number,
  ) => Effect.Effect<
    WebhookSecretRotated,
    DatabaseError | WebhookNotFound | WebhookConflict | WebhookUnavailable
  >;
  readonly listDeliveries: Effect.Effect<ReadonlyArray<WebhookDeliveryValue>, DatabaseError>;
  readonly replay: (
    id: string,
  ) => Effect.Effect<WebhookDeliveryValue, DatabaseError | WebhookNotFound | WebhookConflict>;
  readonly runPending: Effect.Effect<void, DatabaseError>;
}

export class Webhooks extends Context.Service<Webhooks, WebhooksService>()(
  '@froment/api/Webhooks',
) {}

export const WebhooksLive = Layer.effect(
  Webhooks,
  Effect.gen(function* () {
    const { sqlite } = yield* Database;
    const runtime = yield* RuntimeConfiguration;
    const transport = yield* WebhookTransport;
    const signingKey = Option.flatMap(runtime.webhooks.signingKey, (key) => {
      const bytes = Buffer.from(Redacted.value(key), 'base64url');
      return bytes.byteLength === 32 ? Option.some(bytes) : Option.none();
    });
    const getKey = () =>
      Option.match(signingKey, {
        onNone: () => Effect.fail(new WebhookUnavailable({ code: 'webhook.unavailable' })),
        onSome: Effect.succeed,
      });
    const deriveSecret = (key: Buffer, id: string, version: number) =>
      Buffer.from(
        hkdfSync('sha256', key, Buffer.from(id), Buffer.from(`webhook-signing-v${version}`), 32),
      );
    const publicSecret = (key: Buffer, id: string, version: number) =>
      `whsec_v${version}.${deriveSecret(key, id, version).toString('base64url')}`;
    const verify = (url: string) =>
      transport.verify(url, randomBytes(24).toString('base64url')).pipe(
        Effect.catchTag('WebhookTransportError', (error) =>
          Effect.fail(
            new WebhookInvalid({
              code:
                error.reason === 'destination'
                  ? 'webhook.invalid_destination'
                  : 'webhook.verification_failed',
            }),
          ),
        ),
      );

    const listSubscriptions = Effect.try({
      try: () =>
        Schema.decodeUnknownSync(Schema.Array(SubscriptionRow))(
          sqlite.prepare(`${subscriptionSelect} order by created_at desc, id desc`).all(),
        ).map(mapSubscription),
      catch: databaseFailure,
    });
    const createSubscription = Effect.fn('Webhooks.createSubscription')(function* (
      request: WebhookSubscriptionCreate,
      userId: string,
    ) {
      const key = yield* getKey();
      const existing = yield* Effect.try({
        try: () =>
          sqlite.prepare(`${subscriptionSelect} where request_id = ?`).get(request.requestId),
        catch: databaseFailure,
      });
      if (existing !== undefined) {
        const row = Schema.decodeUnknownSync(SubscriptionRow)(existing);
        const subscription = mapSubscription(row);
        if (
          subscription.name !== request.name.trim() ||
          subscription.url !== request.url ||
          JSON.stringify(subscription.eventTypes) !== JSON.stringify(request.eventTypes)
        ) {
          return yield* new WebhookConflict({ code: 'webhook.conflict' });
        }
        return { subscription, secret: publicSecret(key, row.id, row.keyVersion) };
      }
      yield* verify(request.url);
      const now = yield* Clock.currentTimeMillis;
      const id = uuidv7();
      return yield* Effect.try({
        try: () => {
          sqlite
            .prepare(`insert into webhook_subscriptions
              (id, request_id, name, url, event_types, status, key_version, version,
               created_by_user_id, created_at, updated_at)
              values (?, ?, ?, ?, ?, 'active', 1, 1, ?, ?, ?)`)
            .run(
              id,
              request.requestId,
              request.name.trim(),
              request.url,
              JSON.stringify(request.eventTypes),
              userId,
              now,
              now,
            );
          const subscription = mapSubscription(
            Schema.decodeUnknownSync(SubscriptionRow)(
              sqlite.prepare(`${subscriptionSelect} where id = ?`).get(id),
            ),
          );
          return { subscription, secret: publicSecret(key, id, 1) };
        },
        catch: (cause) =>
          isSqliteError(cause, 'SQLITE_CONSTRAINT_UNIQUE')
            ? new WebhookConflict({ code: 'webhook.conflict' })
            : databaseFailure(cause),
      });
    });
    const updateSubscription = Effect.fn('Webhooks.updateSubscription')(function* (
      id: string,
      request: WebhookSubscriptionUpdate,
    ) {
      const current = yield* Effect.try({
        try: () => sqlite.prepare(`${subscriptionSelect} where id = ?`).get(id),
        catch: databaseFailure,
      });
      if (current === undefined) return yield* new WebhookNotFound({ code: 'webhook.not_found' });
      const row = Schema.decodeUnknownSync(SubscriptionRow)(current);
      if (row.version !== request.expectedVersion)
        return yield* new WebhookConflict({ code: 'webhook.conflict' });
      if (request.enabled && (row.url !== request.url || row.status !== 'active'))
        yield* verify(request.url);
      const now = yield* Clock.currentTimeMillis;
      const changed = yield* Effect.try({
        try: () =>
          sqlite
            .prepare(`update webhook_subscriptions
              set name = ?, url = ?, event_types = ?, status = ?, version = version + 1, updated_at = ?
              where id = ? and version = ?`)
            .run(
              request.name.trim(),
              request.url,
              JSON.stringify(request.eventTypes),
              request.enabled ? 'active' : 'disabled',
              now,
              id,
              request.expectedVersion,
            ).changes,
        catch: databaseFailure,
      });
      if (changed !== 1) return yield* new WebhookConflict({ code: 'webhook.conflict' });
      return yield* Effect.try({
        try: () =>
          mapSubscription(
            Schema.decodeUnknownSync(SubscriptionRow)(
              sqlite.prepare(`${subscriptionSelect} where id = ?`).get(id),
            ),
          ),
        catch: databaseFailure,
      });
    });
    const rotateSecret = Effect.fn('Webhooks.rotateSecret')(function* (
      id: string,
      expectedVersion: number,
    ) {
      const key = yield* getKey();
      const now = yield* Clock.currentTimeMillis;
      const changed = yield* Effect.try({
        try: () =>
          sqlite
            .prepare(`update webhook_subscriptions
              set key_version = key_version + 1, version = version + 1, updated_at = ?
              where id = ? and version = ?`)
            .run(now, id, expectedVersion).changes,
        catch: databaseFailure,
      });
      if (changed !== 1) {
        const exists = yield* Effect.try({
          try: () => sqlite.prepare('select 1 from webhook_subscriptions where id = ?').get(id),
          catch: databaseFailure,
        });
        return yield* exists === undefined
          ? new WebhookNotFound({ code: 'webhook.not_found' })
          : new WebhookConflict({ code: 'webhook.conflict' });
      }
      const subscription = yield* Effect.try({
        try: () =>
          mapSubscription(
            Schema.decodeUnknownSync(SubscriptionRow)(
              sqlite.prepare(`${subscriptionSelect} where id = ?`).get(id),
            ),
          ),
        catch: databaseFailure,
      });
      return {
        subscription,
        secret: publicSecret(key, subscription.id, subscription.keyVersion),
      };
    });
    const listDeliveries = Effect.try({
      try: () =>
        Schema.decodeUnknownSync(Schema.Array(DeliveryRow))(
          sqlite.prepare(`${deliverySelect} order by d.created_at desc, d.id desc limit 200`).all(),
        ).map(mapDelivery),
      catch: databaseFailure,
    });
    const replay = Effect.fn('Webhooks.replay')(function* (id: string) {
      const now = yield* Clock.currentTimeMillis;
      const replayId = uuidv7();
      const changed = yield* Effect.try({
        try: () =>
          sqlite
            .prepare(`insert into webhook_deliveries
              (id, event_id, subscription_id, replay_number, replay_of, status, attempts,
               lease, next_attempt_at, created_at)
              select ?, event_id, subscription_id,
                (select coalesce(max(replay_number), 0) + 1 from webhook_deliveries r
                 where r.event_id = d.event_id and r.subscription_id = d.subscription_id),
                ?, 'queued', 0, 0, ?, ?
              from webhook_deliveries d where d.id = ? and d.status in ('delivered', 'failed')`)
            .run(replayId, id, now, now, id).changes,
        catch: databaseFailure,
      });
      if (changed !== 1) {
        const exists = yield* Effect.try({
          try: () =>
            sqlite.prepare('select status from webhook_deliveries where id = ?').pluck().get(id),
          catch: databaseFailure,
        });
        return yield* exists === undefined
          ? new WebhookNotFound({ code: 'webhook.not_found' })
          : new WebhookConflict({ code: 'webhook.conflict' });
      }
      return yield* Effect.try({
        try: () =>
          mapDelivery(
            Schema.decodeUnknownSync(DeliveryRow)(
              sqlite.prepare(`${deliverySelect} where d.id = ?`).get(replayId),
            ),
          ),
        catch: databaseFailure,
      });
    });

    const dispatch = (now: number) =>
      Effect.try({
        try: () =>
          sqlite
            .transaction(() => {
              const events = Schema.decodeUnknownSync(
                Schema.Array(Schema.Struct({ id: Schema.String, eventType: Schema.String })),
              )(
                sqlite
                  .prepare(`select id, event_type as eventType from outbox_events
                    where dispatched_at is null order by occurred_at, id limit 100`)
                  .all(),
              );
              const subscriptions = Schema.decodeUnknownSync(Schema.Array(SubscriptionRow))(
                sqlite.prepare(`${subscriptionSelect} where status = 'active'`).all(),
              );
              const insert = sqlite.prepare(`insert into webhook_deliveries
                (id, event_id, subscription_id, replay_number, replay_of, status, attempts,
                 lease, next_attempt_at, created_at)
                values (?, ?, ?, 0, null, 'queued', 0, 0, ?, ?)
                on conflict(event_id, subscription_id, replay_number) do nothing`);
              for (const event of events) {
                for (const subscription of subscriptions) {
                  const eventTypes = Schema.decodeUnknownSync(Schema.Array(Schema.String))(
                    JSON.parse(subscription.eventTypes),
                  );
                  if (eventTypes.includes(event.eventType))
                    insert.run(uuidv7(), event.id, subscription.id, now, now);
                }
                sqlite
                  .prepare('update outbox_events set dispatched_at = ? where id = ?')
                  .run(now, event.id);
              }
            })
            .immediate(),
        catch: databaseFailure,
      });
    const claim = (id: string, now: number) =>
      Effect.try({
        try: () =>
          sqlite
            .transaction(() => {
              const changed = sqlite
                .prepare(`update webhook_deliveries
                  set status = 'sending', attempts = attempts + 1, lease = lease + 1,
                      last_attempt_at = ?, next_attempt_at = ?
                  where id = ? and status in ('queued', 'retrying') and next_attempt_at <= ?`)
                .run(now, now + runtime.webhooks.requestTimeoutMillis + 30_000, id, now).changes;
              if (changed !== 1) return undefined;
              return Schema.decodeUnknownSync(DeliveryJob)(
                sqlite
                  .prepare(`select d.id, d.event_id as eventId, d.subscription_id as subscriptionId,
                    s.url, s.key_version as keyVersion, e.content, d.attempts, d.lease
                    from webhook_deliveries d
                    join webhook_subscriptions s on s.id = d.subscription_id
                    join outbox_events e on e.id = d.event_id
                    where d.id = ?`)
                  .get(id),
              );
            })
            .immediate(),
        catch: databaseFailure,
      });
    const process = Effect.fn('Webhooks.process')(function* (id: string) {
      const now = yield* Clock.currentTimeMillis;
      const job = yield* claim(id, now);
      if (job === undefined) return;
      const key = Option.getOrUndefined(signingKey);
      const body = Buffer.from(job.content);
      const timestamp = Math.floor(now / 1_000);
      const outcome =
        key === undefined
          ? { status: 0, error: 'webhook.signing_key_unavailable' }
          : yield* transport
              .deliver(
                job.url,
                body,
                `t=${timestamp},k=v${job.keyVersion},v1=${createHmac(
                  'sha256',
                  deriveSecret(key, job.subscriptionId, job.keyVersion),
                )
                  .update(`${timestamp}.`)
                  .update(body)
                  .digest('hex')}`,
              )
              .pipe(
                Effect.map((status) => ({ status, error: null })),
                Effect.catch(() => Effect.succeed({ status: 0, error: 'webhook.delivery_failed' })),
              );
      const finishedAt = yield* Clock.currentTimeMillis;
      const delivered = outcome.status >= 200 && outcome.status < 300;
      const failed = !delivered && job.attempts >= 10;
      const delay = Math.min(3_600_000, 2_000 * 2 ** Math.max(0, job.attempts - 1));
      const random = yield* Random.next;
      const jitter = Math.floor(delay * (0.75 + random * 0.5));
      yield* Effect.try({
        try: () =>
          sqlite
            .prepare(`update webhook_deliveries set status = ?, next_attempt_at = ?,
              delivered_at = ?, response_status = ?, error = ?
              where id = ? and status = 'sending' and lease = ?`)
            .run(
              delivered ? 'delivered' : failed ? 'failed' : 'retrying',
              delivered || failed ? null : finishedAt + jitter,
              delivered ? finishedAt : null,
              outcome.status === 0 ? null : outcome.status,
              delivered ? null : (outcome.error ?? `webhook.http_${outcome.status}`),
              job.id,
              job.lease,
            ),
        catch: databaseFailure,
      });
    });
    const runPending = Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      yield* dispatch(now);
      const ids = yield* Effect.try({
        try: () => {
          sqlite
            .prepare(`update webhook_deliveries
              set status = case when attempts >= 10 then 'failed' else 'retrying' end,
                  error = 'webhook.delivery_interrupted'
              where status = 'sending' and next_attempt_at <= ?`)
            .run(now);
          const retentionCutoff = now - runtime.webhooks.retentionMillis;
          sqlite
            .prepare(`delete from webhook_deliveries where event_id in (
              select e.id from outbox_events e where e.occurred_at < ?
                and e.dispatched_at is not null
                and not exists (select 1 from webhook_deliveries active
                  where active.event_id = e.id and active.status in ('queued', 'sending', 'retrying'))
            )`)
            .run(retentionCutoff);
          sqlite
            .prepare(`delete from outbox_events where occurred_at < ?
              and dispatched_at is not null
              and not exists (select 1 from webhook_deliveries d where d.event_id = outbox_events.id)`)
            .run(retentionCutoff);
          return Schema.decodeUnknownSync(Schema.Array(Schema.String))(
            sqlite
              .prepare(`select d.id from webhook_deliveries d
                join webhook_subscriptions s on s.id = d.subscription_id
                where d.status in ('queued', 'retrying') and d.next_attempt_at <= ?
                  and s.status = 'active'
                  and not exists (
                    select 1 from webhook_deliveries earlier
                    where earlier.subscription_id = d.subscription_id
                      and earlier.status in ('queued', 'sending', 'retrying')
                      and (earlier.created_at < d.created_at
                        or (earlier.created_at = d.created_at and earlier.id < d.id))
                  )
                order by d.created_at, d.id limit 20`)
              .pluck()
              .all(now),
          );
        },
        catch: databaseFailure,
      });
      yield* Effect.forEach(ids, process, { discard: true });
    });
    return Webhooks.of({
      listSubscriptions,
      createSubscription,
      updateSubscription,
      rotateSecret,
      listDeliveries,
      replay,
      runPending,
    });
  }),
);

export const WebhookWorkerLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const webhooks = yield* Webhooks;
    const runtime = yield* RuntimeConfiguration;
    yield* webhooks.runPending.pipe(
      Effect.catch((error) => Effect.logError('webhook.delivery_cycle_failed', error)),
      Effect.repeat(Schedule.spaced(`${runtime.webhooks.workerIntervalMillis} millis`)),
      Effect.forkScoped,
    );
  }),
);
