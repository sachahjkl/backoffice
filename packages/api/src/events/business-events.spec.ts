import { BusinessCloudEvent } from '@froment/contracts';
import { Effect, Layer, Schema } from 'effect';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Audit, AuditLive } from '../audit/audit.js';
import { Database } from '../database/database.js';
import { makeMigratedDatabaseLayer } from '../database/database.spec-helper.js';

const migrationsFolder = join(import.meta.dirname, '../..', 'drizzle');
const clientId = '01ARZ3NDEKTSV4RRFFQ69G5FAA';

const testLayer = () => {
  const database = makeMigratedDatabaseLayer({ filename: ':memory:', migrationsFolder });
  return Layer.merge(database, AuditLive.pipe(Layer.provide(database)));
};

describe('public business events', () => {
  it('publishes an allowlisted audit fact as a separate CloudEvent', async () => {
    const event = await Effect.runPromise(
      Effect.gen(function* () {
        (yield* Audit).insert({
          action: 'client.created',
          actorUserId: null,
          resourceType: 'client',
          resourceId: clientId,
          metadata: { source: 'manual' },
          occurredAt: 1_790_932_800_000,
        });
        const content = (yield* Database).sqlite
          .prepare('select content from outbox_events')
          .pluck()
          .get();
        return Schema.decodeUnknownSync(BusinessCloudEvent)(JSON.parse(String(content)));
      }).pipe(Effect.provide(testLayer())),
    );

    expect(event).toMatchObject({
      type: 'software.froment.client.created.v1',
      subject: `client/${clientId}`,
      dataschema: 'https://froment.software/api/events/schemas/business-event.v1.json',
      data: {
        resourceType: 'client',
        resourceId: clientId,
        actorUserId: null,
        attributes: { source: 'manual' },
      },
    });
  });

  it('keeps technical audit facts private', async () => {
    const count = await Effect.runPromise(
      Effect.gen(function* () {
        (yield* Audit).insert({
          action: 'authentication.login-succeeded',
          actorUserId: null,
          resourceType: 'authentication',
          resourceId: clientId,
          occurredAt: 1_790_932_800_000,
        });
        return (yield* Database).sqlite.prepare('select count(*) from outbox_events').pluck().get();
      }).pipe(Effect.provide(testLayer())),
    );
    expect(count).toBe(0);
  });

  it('rolls back the audit fact and public event together', async () => {
    const counts = await Effect.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const audit = yield* Audit;
        expect(() =>
          database.sqlite
            .transaction(() => {
              audit.insert({
                action: 'supplier.created',
                actorUserId: null,
                resourceType: 'supplier',
                resourceId: clientId,
                occurredAt: 1_790_932_800_000,
              });
              throw new Error('rollback');
            })
            .immediate(),
        ).toThrow('rollback');
        return {
          audits: database.sqlite.prepare('select count(*) from audit_events').pluck().get(),
          events: database.sqlite.prepare('select count(*) from outbox_events').pluck().get(),
        };
      }).pipe(Effect.provide(testLayer())),
    );
    expect(counts).toEqual({ audits: 0, events: 0 });
  });
});
