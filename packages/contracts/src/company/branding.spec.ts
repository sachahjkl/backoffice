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

  it('accepts raster image data and rejects SVG data', () => {
    const request = { name: 'ACME', expectedVersion: 0 };
    expect(
      Schema.decodeUnknownSync(BrandingUpdateRequest)({
        ...request,
        logoUrl: 'data:image/png;base64,iVBORw0KGgo=',
      }).logoUrl,
    ).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(() =>
      Schema.decodeUnknownSync(BrandingUpdateRequest)({
        ...request,
        logoUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
      }),
    ).toThrow();
  });
});
