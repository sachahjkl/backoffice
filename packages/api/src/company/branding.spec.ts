import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { Effect, Layer } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';

import { Audit } from '../audit/audit.js';
import { Database } from '../database/database.js';
import { defaultRuntimeConfig, RuntimeConfiguration } from '../runtime-config.js';
import { Company, CompanyLive } from './service.js';

describe('enterprise branding', () => {
  const connections: Array<Sqlite.Database> = [];
  afterEach(() => connections.splice(0).forEach((connection) => connection.close()));

  it('uses runtime defaults, persists an override, rejects stale writes, and restores defaults', async () => {
    const sqlite = new Sqlite(':memory:');
    connections.push(sqlite);
    sqlite.exec(`create table branding_settings (
      id integer primary key, name text, logo_url text, version integer not null default 0
    ); insert into branding_settings (id) values (1);`);
    const database = Layer.succeed(
      Database,
      Database.of({ sqlite, orm: drizzle({ client: sqlite }) }),
    );
    const audit = Layer.succeed(
      Audit,
      Audit.of({
        insert: () => '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        listAffair: () => Effect.succeed([]),
      }),
    );
    const runtime = Layer.succeed(RuntimeConfiguration, {
      ...defaultRuntimeConfig,
      branding: { name: 'Default enterprise', logoUrl: '/default.png' },
    });
    const layer = CompanyLive.pipe(Layer.provide(Layer.mergeAll(database, audit, runtime)));
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const company = yield* Company;
        const fallback = yield* company.getBranding;
        const updated = yield* company.updateBranding({
          name: 'Acme',
          logoUrl: '/acme.png',
          expectedVersion: 0,
        });
        const stale = yield* company
          .updateBranding({ name: 'Ignored', logoUrl: null, expectedVersion: 0 })
          .pipe(Effect.flip);
        const reset = yield* company.updateBranding({
          name: null,
          logoUrl: null,
          expectedVersion: 1,
        });
        return { fallback, updated, stale, reset };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.fallback).toEqual({
      name: 'Default enterprise',
      logoUrl: '/default.png',
      version: 0,
    });
    expect(result.updated).toEqual({ name: 'Acme', logoUrl: '/acme.png', version: 1 });
    expect(result.stale).toMatchObject({ code: 'company.branding_conflict' });
    expect(result.reset).toEqual({
      name: 'Default enterprise',
      logoUrl: '/default.png',
      version: 2,
    });
  });
});
