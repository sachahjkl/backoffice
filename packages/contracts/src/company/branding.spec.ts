import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { BrandingUpdateRequest } from './branding.js';

describe('branding update', () => {
  it('accepts a reset and rejects unsafe logo addresses', () => {
    expect(
      Schema.decodeUnknownSync(BrandingUpdateRequest)({
        name: null,
        logoUrl: null,
        expectedVersion: 0,
      }),
    ).toEqual({ name: null, logoUrl: null, expectedVersion: 0 });
    expect(() =>
      Schema.decodeUnknownSync(BrandingUpdateRequest)({
        name: 'Example',
        logoUrl: 'javascript:alert(1)',
        expectedVersion: 0,
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BrandingUpdateRequest)({
        name: 'Example',
        logoUrl: '//example.org/logo.png',
        expectedVersion: 0,
      }),
    ).toThrow();
  });
});
