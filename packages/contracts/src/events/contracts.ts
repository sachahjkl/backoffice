import { Schema } from 'effect';

import { CurrencyCode } from '../company/contracts.js';
import { PositiveSafeInteger } from '../documents/lines.js';
import { Ulid } from '../identifiers.js';
import { IsoUtc } from '../temporal.js';

export const EventUuid = Schema.String.check(Schema.isUUID(7));
export type EventUuid = typeof EventUuid.Type;
const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

export const InvoiceIssuedEventType = Schema.Literal('software.froment.invoice.issued.v1');
export const PublicEventType = InvoiceIssuedEventType;
export type PublicEventType = typeof PublicEventType.Type;

export const InvoiceIssuedEventData = Schema.Struct({
  invoiceId: Ulid,
  invoiceNumber: Schema.String.check(Schema.isPattern(/\S/), Schema.isMaxLength(160)),
  revisionId: Ulid,
  version: PositiveSafeInteger,
  currency: CurrencyCode,
  netTotalCents: NonNegativeInt,
  vatTotalCents: NonNegativeInt,
  totalCents: PositiveSafeInteger,
});
export type InvoiceIssuedEventData = typeof InvoiceIssuedEventData.Type;

export const InvoiceIssuedCloudEvent = Schema.Struct({
  specversion: Schema.Literal('1.0'),
  id: EventUuid,
  source: Schema.String.check(
    Schema.isPattern(
      /^urn:froment:installation:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    ),
  ),
  type: InvoiceIssuedEventType,
  subject: Schema.String.check(Schema.isPattern(/^invoice\/[0-9A-HJKMNP-TV-Z]{26}$/)),
  time: IsoUtc,
  datacontenttype: Schema.Literal('application/json'),
  dataschema: Schema.Literal(
    'https://froment.software/api/events/schemas/software.froment.invoice.issued.v1.json',
  ),
  correlationid: EventUuid,
  causationid: EventUuid,
  traceparent: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/)),
  ),
  tracestate: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(512))),
  data: InvoiceIssuedEventData,
});
export type InvoiceIssuedCloudEvent = typeof InvoiceIssuedCloudEvent.Type;
export const PublicCloudEvent = InvoiceIssuedCloudEvent;
export type PublicCloudEvent = typeof PublicCloudEvent.Type;

export const WebhookSubscriptionId = EventUuid;
export const WebhookDeliveryId = EventUuid;
export const WebhookSubscriptionStatus = Schema.Literals(['active', 'disabled']);
export const WebhookDeliveryStatus = Schema.Literals([
  'queued',
  'sending',
  'retrying',
  'delivered',
  'failed',
]);

const WebhookName = Schema.String.check(Schema.isPattern(/\S/), Schema.isMaxLength(80));
const WebhookUrl = Schema.String.check(Schema.isPattern(/^https?:\/\//), Schema.isMaxLength(2_048));
const EventTypes = Schema.Array(PublicEventType).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(20),
);

export const WebhookSubscriptionCreate = Schema.Struct({
  requestId: Schema.String.check(Schema.isUUID(4)),
  name: WebhookName,
  url: WebhookUrl,
  eventTypes: EventTypes,
});
export type WebhookSubscriptionCreate = typeof WebhookSubscriptionCreate.Type;

export const WebhookSubscriptionUpdate = Schema.Struct({
  expectedVersion: PositiveSafeInteger,
  name: WebhookName,
  url: WebhookUrl,
  eventTypes: EventTypes,
  enabled: Schema.Boolean,
});
export type WebhookSubscriptionUpdate = typeof WebhookSubscriptionUpdate.Type;

export const WebhookSubscription = Schema.Struct({
  id: WebhookSubscriptionId,
  name: WebhookName,
  url: WebhookUrl,
  eventTypes: EventTypes,
  status: WebhookSubscriptionStatus,
  keyVersion: PositiveSafeInteger,
  version: PositiveSafeInteger,
  createdAt: IsoUtc,
  updatedAt: IsoUtc,
});
export type WebhookSubscription = typeof WebhookSubscription.Type;
export const WebhookSubscriptionList = Schema.Array(WebhookSubscription);

export const WebhookSubscriptionCreated = Schema.Struct({
  subscription: WebhookSubscription,
  secret: Schema.String.check(Schema.isPattern(/^whsec_v[1-9][0-9]*\.[A-Za-z0-9_-]{43}$/)),
});
export type WebhookSubscriptionCreated = typeof WebhookSubscriptionCreated.Type;

export const WebhookSecretRotated = Schema.Struct({
  subscription: WebhookSubscription,
  secret: WebhookSubscriptionCreated.fields.secret,
});
export type WebhookSecretRotated = typeof WebhookSecretRotated.Type;

export const WebhookExpectedVersion = Schema.Struct({
  expectedVersion: PositiveSafeInteger,
});

export const WebhookDelivery = Schema.Struct({
  id: WebhookDeliveryId,
  eventId: EventUuid,
  subscriptionId: WebhookSubscriptionId,
  eventType: PublicEventType,
  subject: Schema.String,
  status: WebhookDeliveryStatus,
  attempts: NonNegativeInt,
  responseStatus: Schema.NullOr(Schema.Int),
  error: Schema.NullOr(Schema.String),
  createdAt: IsoUtc,
  nextAttemptAt: Schema.NullOr(IsoUtc),
  deliveredAt: Schema.NullOr(IsoUtc),
  replayOf: Schema.NullOr(WebhookDeliveryId),
});
export type WebhookDelivery = typeof WebhookDelivery.Type;
export const WebhookDeliveryList = Schema.Array(WebhookDelivery);

export class WebhookNotFound extends Schema.TaggedError<WebhookNotFound>()(
  'WebhookNotFound',
  { code: Schema.Literal('webhook.not_found') },
  { httpApiStatus: 404 },
) {}

export class WebhookConflict extends Schema.TaggedError<WebhookConflict>()(
  'WebhookConflict',
  { code: Schema.Literal('webhook.conflict') },
  { httpApiStatus: 409 },
) {}

export class WebhookInvalid extends Schema.TaggedError<WebhookInvalid>()(
  'WebhookInvalid',
  { code: Schema.Literals(['webhook.invalid_destination', 'webhook.verification_failed']) },
  { httpApiStatus: 422 },
) {}

export class WebhookUnavailable extends Schema.TaggedError<WebhookUnavailable>()(
  'WebhookUnavailable',
  { code: Schema.Literal('webhook.unavailable') },
  { httpApiStatus: 503 },
) {}
