import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { RuntimeConfiguration } from './runtime-configuration';

describe('RuntimeConfiguration', () => {
  afterEach(() => {
    globalThis.fromentRuntimeConfig = undefined;
  });
  it('uses development when the runtime script is unavailable', () => {
    globalThis.fromentRuntimeConfig = undefined;
    expect(TestBed.inject(RuntimeConfiguration).value).toEqual({
      appEnvironment: 'development',
      sitePhase: 'live',
      commit: null,
      githubRepositoryUrl: null,
      demo: null,
    });
  });

  it('identifies the production construction phase', () => {
    globalThis.fromentRuntimeConfig = {
      appEnvironment: 'production',
      sitePhase: 'construction',
      commit: '6c9757782e249d4db6ffb804349b7da620494565',
      githubRepositoryUrl: 'https://github.com/example/application',
      demo: null,
    };
    const runtime = TestBed.inject(RuntimeConfiguration);
    expect(runtime.value).toEqual(globalThis.fromentRuntimeConfig);
    expect(runtime.productionConstruction).toBe(true);
  });

  it.each([
    'https://github.com/example/application',
    'https://github.com/example/application/',
    'https://github.com/example/application.git',
  ])('links a commit to the configured repository %s', (githubRepositoryUrl) => {
    globalThis.fromentRuntimeConfig = {
      appEnvironment: 'staging',
      sitePhase: 'live',
      commit: '6c9757782e249d4db6ffb804349b7da620494565',
      githubRepositoryUrl,
      demo: null,
    };
    const runtime = TestBed.inject(RuntimeConfiguration);
    expect(runtime.commitUrl(runtime.value?.commit)).toBe(
      'https://github.com/example/application/commit/6c9757782e249d4db6ffb804349b7da620494565',
    );
  });
});
