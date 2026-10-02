import { PublicCloudEvent, type WebhookSubscriptionCreate } from '@froment/contracts';
import { Clock, Effect, Layer, Option, Redacted, Schema } from 'effect';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { v7 as uuidv7 } from 'uuid';

import { Database } from '../database/database.js';
import { makeMigratedDatabaseLayer } from '../database/database.spec-helper.js';
import {
  defaultRuntimeConfig,
  RuntimeConfiguration,
  type RuntimeConfigValue,
  WebhookSigningKey,
} from '../runtime-config.js';
import { EventOutbox, EventOutboxLive } from './outbox.js';
import {
  WebhookTransport,
  WebhookTransportError,
  WebhookTransportLive,
  isWebhookAddressAllowed,
  type WebhookTransportService,
} from './transport.js';
import { Webhooks, WebhooksLive } from './webhooks.js';

const migrationsFolder = join(import.meta.dirname, '../..', 'drizzle');
const userId = '01ARZ3NDEKTSV4RRFFQ69G5FAA';
const invoiceId = '01ARZ3NDEKTSV4RRFFQ69G5FAB';
const revisionId = '01ARZ3NDEKTSV4RRFFQ69G5FAC';
const signingKeyText = Buffer.alloc(32, 7).toString('base64url');

const runtime = (overrides: Partial<RuntimeConfigValue['webhooks']> = {}): RuntimeConfigValue => ({
  ...defaultRuntimeConfig,
  webhooks: {
    ...defaultRuntimeConfig.webhooks,
    signingKey: Option.some(
      Redacted.make(Schema.decodeUnknownSync(WebhookSigningKey)(signingKeyText)),
    ),
    ...overrides,
  },
});

const request: WebhookSubscriptionCreate = {
  requestId: 'c2e82cc5-9fd8-4490-a13f-680fa743ce23',
  name: 'Comptabilité',
  url: 'https://events.example.test/froment',
  eventTypes: ['software.froment.invoice.issued.v1'],
};

const eventData = {
  invoiceId,
  invoiceNumber: 'F-2026-0042',
  revisionId,
  version: 2,
  currency: 'EUR' as const,
  netTotalCents: 100_000,
  vatTotalCents: 20_000,
  totalCents: 120_000,
};

const makeLayer = (transport: WebhookTransportService, config = runtime()) => {
  const database = makeMigratedDatabaseLayer({ filename: ':memory:', migrationsFolder });
  const runtimeLayer = Layer.succeed(RuntimeConfiguration, config);
  const outbox = EventOutboxLive.pipe(Layer.provide(database));
  const webhooks = WebhooksLive.pipe(
    Layer.provide(Layer.succeed(WebhookTransport, transport)),
    Layer.provide(runtimeLayer),
    Layer.provide(database),
  );
  return Layer.mergeAll(database, outbox, webhooks, runtimeLayer);
};

const seedUser = Database.use(({ sqlite }) =>
  Effect.sync(() => {
    sqlite
      .prepare(`insert into users (id, display_name, kind, created_at, updated_at)
        values (?, 'Administrator', 'administrator', 1, 1)`)
      .run(userId);
  }),
);

describe('event outbox and webhooks', () => {
  it('rolls back an event with its enclosing business transaction', async () => {
    const transport: WebhookTransportService = {
      verify: () => Effect.void,
      deliver: () => Effect.succeed(204),
    };
    const count = await Effect.runPromise(
      Effect.gen(function* () {
        const { sqlite } = yield* Database;
        const outbox = yield* EventOutbox;
        expect(() =>
          sqlite
            .transaction(() => {
              outbox.insertInvoiceIssued(eventData, 1_790_932_800_000);
              throw new Error('rollback');
            })
            .immediate(),
        ).toThrow('rollback');
        return sqlite.prepare('select count(*) from outbox_events').pluck().get();
      }).pipe(Effect.provide(makeLayer(transport))),
    );
    expect(count).toBe(0);
  });

  it('signs raw CloudEvents bytes, preserves order and keeps identity during replay', async () => {
    const requests: Array<{ readonly body: Uint8Array; readonly signature: string }> = [];
    const transport: WebhookTransportService = {
      verify: (_url, challenge) =>
        challenge.length > 0
          ? Effect.void
          : Effect.fail(new WebhookTransportError({ reason: 'verification' })),
      deliver: (_url, body, signature) => {
        requests.push({ body, signature });
        return Effect.succeed(204);
      },
    };
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        yield* seedUser;
        const outbox = yield* EventOutbox;
        const webhooks = yield* Webhooks;
        const created = yield* webhooks.createSubscription(request, userId);
        const first = outbox.insertInvoiceIssued(eventData, 1_790_932_800_000);
        const second = outbox.insertInvoiceIssued(
          { ...eventData, invoiceNumber: 'F-2026-0043' },
          1_790_932_801_000,
        );
        yield* webhooks.runPending;
        const afterFirst = yield* webhooks.listDeliveries;
        yield* webhooks.runPending;
        const delivered = yield* webhooks.listDeliveries;
        const firstDelivery = delivered.find((entry) => entry.eventId === first.id);
        if (firstDelivery === undefined) return yield* Effect.die('first delivery missing');
        const replay = yield* webhooks.replay(firstDelivery.id);
        yield* webhooks.runPending;
        return { created, first, second, afterFirst, delivered, replay };
      }).pipe(Effect.provide(makeLayer(transport))),
    );

    expect(result.afterFirst.filter(({ status }) => status === 'delivered')).toHaveLength(1);
    expect(result.delivered.filter(({ status }) => status === 'delivered')).toHaveLength(2);
    expect(requests).toHaveLength(3);
    const decoded = requests.map(({ body }) =>
      Schema.decodeUnknownSync(PublicCloudEvent)(JSON.parse(Buffer.from(body).toString())),
    );
    expect(decoded.map(({ id }) => id)).toEqual([
      result.first.id,
      result.second.id,
      result.first.id,
    ]);
    const [prefix, secretText] = result.created.secret.split('.');
    expect(prefix).toBe('whsec_v1');
    const firstSignature = requests[0]?.signature;
    const timestamp = firstSignature?.match(/^t=([0-9]+),/)?.[1];
    expect(timestamp).toBeDefined();
    expect(firstSignature).toBe(
      `t=${timestamp},k=v1,v1=${createHmac('sha256', Buffer.from(secretText!, 'base64url'))
        .update(`${timestamp}.`)
        .update(requests[0]!.body)
        .digest('hex')}`,
    );
    expect(result.replay.replayOf).toBe(
      result.delivered.find(({ eventId }) => eventId === result.first.id)?.id,
    );
  });

  it('retries a failed delivery without changing its event', async () => {
    const eventIds: Array<string> = [];
    let attempt = 0;
    const transport: WebhookTransportService = {
      verify: () => Effect.void,
      deliver: (_url, body) => {
        eventIds.push(JSON.parse(Buffer.from(body).toString()).id as string);
        attempt += 1;
        return Effect.succeed(attempt === 1 ? 503 : 204);
      },
    };
    const delivery = await Effect.runPromise(
      Effect.gen(function* () {
        yield* seedUser;
        const webhooks = yield* Webhooks;
        const outbox = yield* EventOutbox;
        yield* webhooks.createSubscription(request, userId);
        outbox.insertInvoiceIssued(eventData, 1_790_932_800_000);
        yield* webhooks.runPending;
        const { sqlite } = yield* Database;
        sqlite.prepare('update webhook_deliveries set next_attempt_at = 0').run();
        yield* webhooks.runPending;
        return (yield* webhooks.listDeliveries)[0];
      }).pipe(Effect.provide(makeLayer(transport))),
    );
    expect(delivery?.status).toBe('delivered');
    expect(delivery?.attempts).toBe(2);
    expect(eventIds).toHaveLength(2);
    expect(new Set(eventIds).size).toBe(1);
  });

  it('recovers an expired lease and unblocks the next event after terminal failure', async () => {
    const deliveredNumbers: Array<string> = [];
    const transport: WebhookTransportService = {
      verify: () => Effect.void,
      deliver: (_url, body) => {
        const event = Schema.decodeUnknownSync(PublicCloudEvent)(
          JSON.parse(Buffer.from(body).toString()),
        );
        if (event.type !== 'software.froment.invoice.issued.v1')
          return Effect.die('unexpected event type');
        deliveredNumbers.push(event.data.invoiceNumber);
        return Effect.succeed(event.data.invoiceNumber === 'F-2026-0042' ? 503 : 204);
      },
    };
    const deliveries = await Effect.runPromise(
      Effect.gen(function* () {
        yield* seedUser;
        const webhooks = yield* Webhooks;
        const outbox = yield* EventOutbox;
        yield* webhooks.createSubscription(request, userId);
        outbox.insertInvoiceIssued(eventData, 1_790_932_800_000);
        outbox.insertInvoiceIssued(
          { ...eventData, invoiceNumber: 'F-2026-0043' },
          1_790_932_801_000,
        );
        yield* webhooks.runPending;
        const { sqlite } = yield* Database;
        sqlite
          .prepare(`update webhook_deliveries set status = 'sending', attempts = 9,
            next_attempt_at = 0 where status = 'retrying'`)
          .run();
        yield* webhooks.runPending;
        yield* webhooks.runPending;
        return yield* webhooks.listDeliveries;
      }).pipe(Effect.provide(makeLayer(transport))),
    );
    expect(deliveries.map(({ status }) => status).sort()).toEqual(['delivered', 'failed']);
    expect(deliveredNumbers).toEqual(['F-2026-0042', 'F-2026-0042', 'F-2026-0043']);
  });

  it('does not claim a selected delivery after its subscription is disabled', async () => {
    let database: typeof Database.Service;
    let attempts = 0;
    const transport: WebhookTransportService = {
      verify: () => Effect.void,
      deliver: () => {
        attempts += 1;
        database.sqlite.prepare("update webhook_subscriptions set status = 'disabled'").run();
        return Effect.succeed(204);
      },
    };
    const deliveries = await Effect.runPromise(
      Effect.gen(function* () {
        yield* seedUser;
        database = yield* Database;
        const webhooks = yield* Webhooks;
        const outbox = yield* EventOutbox;
        yield* webhooks.createSubscription(request, userId);
        yield* webhooks.createSubscription(
          {
            ...request,
            requestId: 'ab0373d5-9c1e-443b-9895-7f9ddd582cee',
            name: 'Archive',
            url: 'https://archive.example.test/froment',
          },
          userId,
        );
        outbox.insertInvoiceIssued(eventData, 1_790_932_800_000);
        yield* webhooks.runPending;
        return yield* webhooks.listDeliveries;
      }).pipe(Effect.provide(makeLayer(transport))),
    );
    expect(attempts).toBe(1);
    expect(deliveries.map(({ status }) => status).sort()).toEqual(['delivered', 'queued']);
  });

  it('keeps deliveries queued until the signing key is restored', async () => {
    let attempts = 0;
    const transport: WebhookTransportService = {
      verify: () => Effect.void,
      deliver: () => {
        attempts += 1;
        return Effect.succeed(204);
      },
    };
    const deliveries = await Effect.runPromise(
      Effect.gen(function* () {
        yield* seedUser;
        const database = yield* Database;
        const { sqlite } = database;
        const subscriptionId = uuidv7();
        sqlite
          .prepare(`insert into webhook_subscriptions
            (id, request_id, name, url, event_types, status, key_version, version,
             created_by_user_id, created_at, updated_at)
            values (?, ?, 'Accounting', ?, ?, 'active', 1, 1, ?, 1, 1)`)
          .run(
            subscriptionId,
            request.requestId,
            request.url,
            JSON.stringify(request.eventTypes),
            userId,
          );
        (yield* EventOutbox).insertInvoiceIssued(eventData, 1_790_932_800_000);
        yield* (yield* Webhooks).runPending;
        const suspended = sqlite
          .prepare('select status, attempts from webhook_deliveries')
          .get() as {
          readonly status: string;
          readonly attempts: number;
        };
        const restoredWebhooks = Layer.fresh(WebhooksLive).pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(WebhookTransport, transport),
              Layer.succeed(RuntimeConfiguration, runtime()),
              Layer.succeed(Database, database),
            ),
          ),
        );
        yield* Webhooks.use(({ runPending }) => runPending).pipe(Effect.provide(restoredWebhooks));
        const delivered = sqlite
          .prepare('select status, attempts from webhook_deliveries')
          .get() as {
          readonly status: string;
          readonly attempts: number;
        };
        return { suspended, delivered };
      }).pipe(Effect.provide(makeLayer(transport, runtime({ signingKey: Option.none() })))),
    );
    expect(attempts).toBe(1);
    expect(deliveries).toEqual({
      suspended: { status: 'queued', attempts: 0 },
      delivered: { status: 'delivered', attempts: 1 },
    });
  });

  it('retains history from completion instead of event occurrence', async () => {
    const transport: WebhookTransportService = {
      verify: () => Effect.void,
      deliver: () => Effect.succeed(204),
    };
    const counts = await Effect.runPromise(
      Effect.gen(function* () {
        yield* seedUser;
        const webhooks = yield* Webhooks;
        const outbox = yield* EventOutbox;
        const { sqlite } = yield* Database;
        const now = yield* Clock.currentTimeMillis;
        yield* webhooks.createSubscription(request, userId);
        outbox.insertInvoiceIssued(eventData, now - 10_000);
        yield* webhooks.runPending;
        yield* webhooks.runPending;
        const retained = sqlite.prepare('select count(*) from outbox_events').pluck().get();
        sqlite.prepare('update webhook_deliveries set completed_at = ?').run(now - 2_000);
        yield* webhooks.runPending;
        const removed = sqlite.prepare('select count(*) from outbox_events').pluck().get();
        return { retained, removed };
      }).pipe(Effect.provide(makeLayer(transport, runtime({ retentionMillis: 1_000 })))),
    );
    expect(counts).toEqual({ retained: 1, removed: 0 });
  });
});

describe('webhook destination protection', () => {
  it('allows public IPv4 addresses and rejects mapped private addresses', () => {
    expect(isWebhookAddressAllowed('1.1.1.1')).toBe(true);
    expect(isWebhookAddressAllowed('::ffff:1.1.1.1')).toBe(true);
    expect(isWebhookAddressAllowed('127.0.0.1')).toBe(false);
    expect(isWebhookAddressAllowed('::ffff:127.0.0.1')).toBe(false);
  });

  it('delivers through a hostname when DNS requests all addresses', async () => {
    const server = createServer((_request, response) => response.writeHead(204).end());
    await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
    try {
      const address = server.address() as AddressInfo;
      const status = await Effect.runPromise(
        WebhookTransport.use((transport) =>
          transport.deliver(`http://localhost:${address.port}/events`, Buffer.from('{}'), 'test'),
        ).pipe(
          Effect.provide(WebhookTransportLive),
          Effect.provide(
            Layer.succeed(RuntimeConfiguration, runtime({ allowPrivateDestinations: true })),
          ),
        ),
      );
      expect(status).toBe(204);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('enforces an absolute deadline while response headers are pending', async () => {
    const server = createServer(async (_request, response) => {
      await delay(100);
      response.writeHead(204).end();
    });
    await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
    try {
      const address = server.address() as AddressInfo;
      const outcome = await Effect.runPromise(
        WebhookTransport.use((transport) =>
          Effect.result(
            transport.deliver(`http://localhost:${address.port}/events`, Buffer.from('{}'), 'test'),
          ),
        ).pipe(
          Effect.provide(WebhookTransportLive),
          Effect.provide(
            Layer.succeed(
              RuntimeConfiguration,
              runtime({ allowPrivateDestinations: true, requestTimeoutMillis: 20 }),
            ),
          ),
        ),
      );
      expect(outcome._tag).toBe('Failure');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('rejects a private destination before opening a connection', async () => {
    const outcome = await Effect.runPromise(
      WebhookTransport.use((transport) =>
        Effect.result(
          transport.deliver('https://127.0.0.1/private', Buffer.from('{}'), 'signature'),
        ),
      ).pipe(
        Effect.provide(WebhookTransportLive),
        Effect.provide(Layer.succeed(RuntimeConfiguration, runtime())),
      ),
    );
    expect(outcome._tag).toBe('Failure');
    if (outcome._tag === 'Failure') expect(outcome.failure.reason).toBe('destination');
  });
});
