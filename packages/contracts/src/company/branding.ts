import { Schema } from 'effect';

export const BrandingName = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(120));
export const BrandingLogoUrl = Schema.String.check(
  Schema.isMaxLength(2048),
  Schema.isPattern(/^(?:\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/),
);

export const Branding = Schema.Struct({
  name: BrandingName,
  logoUrl: BrandingLogoUrl,
  version: Schema.Int,
});
export type Branding = typeof Branding.Type;

export const BrandingUpdateRequest = Schema.Struct({
  name: Schema.NullOr(BrandingName),
  logoUrl: Schema.NullOr(BrandingLogoUrl),
  expectedVersion: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});
export type BrandingUpdateRequest = typeof BrandingUpdateRequest.Type;

export class BrandingConflict extends Schema.TaggedError<BrandingConflict>()('BrandingConflict', {
  code: Schema.Literal('company.branding_conflict'),
}) {}
