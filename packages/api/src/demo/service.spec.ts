import { Effect, Layer, Option, Redacted, Schema } from 'effect';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AuditLive } from '../audit/audit.js';
import { Passwords } from '../authentication/password.js';
import { allocateBusinessReference } from '../business/business-references.js';
import { Database } from '../database/database.js';
import { makeMigratedDatabaseLayer } from '../database/database.spec-helper.js';
import { defaultRuntimeConfig, RuntimeConfiguration } from '../runtime-config.js';
import { Demo, DemoLive } from './service.js';
import { CurrentOrderConfirmationEvidence } from '../orders/confirmation-evidence.js';

const layer = (
  appEnvironment: 'development' | 'staging' | 'production' = 'staging',
  enabled = true,
  accountPassword = 'demo-account-password',
) => {
  const database = makeMigratedDatabaseLayer({
    filename: ':memory:',
    migrationsFolder: join(import.meta.dirname, '../../drizzle'),
  });
  const dependencies = Layer.mergeAll(
    database,
    AuditLive.pipe(Layer.provide(database)),
    Layer.succeed(
      Passwords,
      Passwords.of({
        hash: (password) => Effect.succeed(`$argon2id$demo:${password}`),
        verify: () => Effect.succeed(true),
      }),
    ),
    Layer.succeed(RuntimeConfiguration, {
      ...defaultRuntimeConfig,
      branding: { ...defaultRuntimeConfig.branding, name: 'ACME' },
      application: { ...defaultRuntimeConfig.application, appEnvironment },
      demo: {
        enabled,
        password: Option.some(Redacted.make('demo-secret')),
        accountPassword: Option.some(Redacted.make(accountPassword)),
      },
    }),
  );
  return Layer.merge(database, DemoLive.pipe(Layer.provide(dependencies)));
};

describe('Demonstration reset', () => {
  it('migrates an empty branding singleton without assigning a company name', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        expect(
          database.sqlite
            .prepare('select id, name, logo_url as logoUrl, version from branding_settings')
            .all(),
        ).toEqual([{ id: 1, name: null, logoUrl: null, version: 0 }]);
        expect(() =>
          database.sqlite.prepare('insert into branding_settings (id) values (2)').run(),
        ).toThrow();
      }).pipe(Effect.provide(layer())),
    );
  });

  it('replaces a migrated database with valid deterministic staging data', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const demo = yield* Demo;
        const database = yield* Database;
        const first = yield* demo.reset(
          { password: 'demo-secret', confirmed: true },
          '01ARZ3NDEKTSV4RRFFQ69G5FAA',
        );
        expect(
          database.sqlite
            .prepare('select id, name, logo_url as logoUrl, version from branding_settings')
            .all(),
        ).toEqual([{ id: 1, name: 'ACME', logoUrl: null, version: 0 }]);
        expect(
          database.sqlite
            .prepare('select display_name from issuer_settings where id = 1')
            .pluck()
            .get(),
        ).toBe('ACME');
        expect(
          database.sqlite
            .prepare(
              'select render_snapshot from quote_revisions where render_snapshot is not null limit 1',
            )
            .pluck()
            .get(),
        ).toContain('ACME');
        database.sqlite
          .prepare(
            "update branding_settings set name = 'Autre marque', logo_url = '/custom.svg', version = 3 where id = 1",
          )
          .run();
        const firstClientNames = Schema.decodeUnknownSync(Schema.Array(Schema.String))(
          database.sqlite
            .prepare(
              'select users.display_name from clients join users on users.id = clients.id order by clients.id',
            )
            .pluck()
            .all(),
        );
        const second = yield* demo.reset(
          { password: 'demo-secret', confirmed: true },
          '01ARZ3NDEKTSV4RRFFQ69G5FAA',
        );
        expect(second).toEqual(first);
        expect(
          database.sqlite
            .prepare('select password_hash from password_credentials limit 1')
            .pluck()
            .get(),
        ).toBe('$argon2id$demo:demo-account-password');
        expect(
          database.sqlite
            .prepare('select id, name, logo_url as logoUrl, version from branding_settings')
            .all(),
        ).toEqual([{ id: 1, name: 'ACME', logoUrl: null, version: 0 }]);
        const secondClientNames = Schema.decodeUnknownSync(Schema.Array(Schema.String))(
          database.sqlite
            .prepare(
              'select users.display_name from clients join users on users.id = clients.id order by clients.id',
            )
            .pluck()
            .all(),
        );
        expect(secondClientNames).toEqual(firstClientNames);
        expect(new Set(firstClientNames).size).toBeGreaterThan(45);
        expect(
          firstClientNames.every((name) => !name.toLowerCase().includes('démonstration')),
        ).toBe(true);
        const year = new Date().getUTCFullYear();
        expect(allocateBusinessReference(database.sqlite, 'affair', year)).toBe(
          `AF-${year}-000101`,
        );
        expect(allocateBusinessReference(database.sqlite, 'quote', year)).toBe(`DE-${year}-000181`);
        expect(database.sqlite.pragma('foreign_key_check')).toEqual([]);
        expect(
          Schema.decodeUnknownSync(Schema.Int)(
            database.sqlite.prepare('select count(*) from users').pluck().get(),
          ),
        ).toBeGreaterThan(5);
        expect(
          database.sqlite
            .prepare('select adapter from accounting_tax_filing_settings where id = 1')
            .pluck()
            .get(),
        ).toBe('local');
        const confirmationEvidence = Schema.decodeUnknownSync(Schema.Uint8Array)(
          database.sqlite
            .prepare('select evidence_content from quote_signatures order by id limit 1')
            .pluck()
            .get(),
        );
        expect(
          Schema.decodeUnknownSync(Schema.fromJsonString(CurrentOrderConfirmationEvidence))(
            Buffer.from(confirmationEvidence).toString('utf8'),
          ),
        ).toEqual({ version: 2, orderCalendar: { timeZone: 'Europe/Paris' } });
      }).pipe(Effect.provide(layer())),
    );
  });

  it('accepts a development environment', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const demo = yield* Demo;
        const result = yield* demo.reset(
          { password: 'demo-secret', confirmed: true },
          '01ARZ3NDEKTSV4RRFFQ69G5FAA',
        );
        expect(result.clients).toBeGreaterThan(0);
      }).pipe(Effect.provide(layer('development'))),
    );
  });

  it('rejects a production environment', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const demo = yield* Demo;
        const error = yield* demo
          .reset({ password: 'demo-secret', confirmed: true }, '01ARZ3NDEKTSV4RRFFQ69G5FAA')
          .pipe(Effect.flip);
        expect(error._tag).toBe('DemoResetRejected');
        if (error._tag === 'DemoResetRejected')
          expect(error.code).toBe('demo.environment_rejected');
      }).pipe(Effect.provide(layer('production'))),
    );
  });

  it('rejects reset when demo mode is disabled without changing the database', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const demo = yield* Demo;
        const database = yield* Database;
        const error = yield* demo
          .reset({ password: 'demo-secret', confirmed: true }, '01ARZ3NDEKTSV4RRFFQ69G5FAA')
          .pipe(Effect.flip);
        expect(error._tag).toBe('DemoResetRejected');
        expect(database.sqlite.prepare('select count(*) from users').pluck().get()).toBe(0);
      }).pipe(Effect.provide(layer('staging', false))),
    );
  });

  it('rejects an account password that matches the reset secret', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const demo = yield* Demo;
        const error = yield* demo
          .reset({ password: 'demo-secret', confirmed: true }, '01ARZ3NDEKTSV4RRFFQ69G5FAA')
          .pipe(Effect.flip);
        expect(error._tag).toBe('DemoResetRejected');
        if (error._tag === 'DemoResetRejected') expect(error.code).toBe('demo.password_conflict');
      }).pipe(Effect.provide(layer('staging', true, 'demo-secret'))),
    );
  });
});
