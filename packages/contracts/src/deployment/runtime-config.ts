import { Schema } from 'effect';
import { GitCommit } from './contracts.js';

export const AppEnvironment = Schema.Literals(['development', 'staging', 'production']);
export type AppEnvironment = typeof AppEnvironment.Type;

export const SitePhase = Schema.Literals(['construction', 'live']);
export type SitePhase = typeof SitePhase.Type;

export const PublicRuntimeConfig = Schema.Struct({
  appEnvironment: AppEnvironment,
  sitePhase: SitePhase,
  commit: Schema.NullOr(GitCommit),
  githubRepositoryUrl: Schema.NullOr(Schema.String),
});
export type PublicRuntimeConfig = typeof PublicRuntimeConfig.Type;
