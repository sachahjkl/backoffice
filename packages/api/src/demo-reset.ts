import { NodeRuntime } from '@effect/platform-node';
import { Config, DateTime, Effect, Layer, Option, Redacted, Schema } from 'effect';
import { AuditLive } from './audit/audit.js';
import { PasswordsLive } from './authentication/password.js';
import { DatabaseLive, migrateDatabase } from './database/database.js';
import { Demo, DemoLive } from './demo/service.js';
import { RuntimeConfiguration, RuntimeConfigurationLive } from './runtime-config.js';

const run = Effect.gen(function* () {
  const runtime = yield* RuntimeConfiguration;
  if (runtime.application.appEnvironment === 'production' || !runtime.demo.enabled)
    return yield* Effect.fail(new Error('demo.environment_rejected'));
  const password = Option.getOrUndefined(runtime.demo.password);
  if (password === undefined || Option.isNone(runtime.demo.accountPassword))
    return yield* Effect.fail(new Error('demo.secret_missing'));
  if (Redacted.value(password) === Redacted.value(runtime.demo.accountPassword.value))
    return yield* Effect.fail(new Error('demo.password_conflict'));

  const filename = yield* Config.string('DATABASE_PATH').pipe(
    Config.withDefault('data/froment.sqlite'),
  );
  const migrationsFolder = yield* Config.string('MIGRATIONS_ROOT');
  const timeZoneName = yield* Config.schema(
    Schema.String.check(
      Schema.makeFilter((value) => Option.isSome(DateTime.zoneMakeNamed(value)), {
        message: 'config.time_zone.invalid',
      }),
    ),
    'BUSINESS_TIME_ZONE',
  );
  yield* migrateDatabase({
    filename,
    migrationsFolder,
    businessTimeZone: DateTime.zoneMakeNamedUnsafe(timeZoneName),
  });
  const result = yield* Effect.scoped(
    Effect.gen(function* () {
      const demo = yield* Demo;
      return yield* demo.reset(
        { password: Redacted.value(password), confirmed: true },
        '01HF7YAT000000000000000001',
      );
    }).pipe(
      Effect.provide(
        DemoLive.pipe(
          Layer.provideMerge(AuditLive),
          Layer.provideMerge(PasswordsLive),
          Layer.provideMerge(DatabaseLive),
        ),
      ),
    ),
  );
  yield* Effect.logInfo('demo.reset.completed', result);
}).pipe(Effect.provide(RuntimeConfigurationLive));

NodeRuntime.runMain(run);
