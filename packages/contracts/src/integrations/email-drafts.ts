import { Schema } from 'effect';
import { SafeInteger, PositiveSafeInteger } from '../documents/lines.js';
import {
  AuthenticationRequired,
  PermissionDenied,
  RequestRateLimited,
} from '../authentication/contracts.js';
import { IsoUtc } from '../temporal.js';
import { EmailBody, EmailBodyFormat, emailBodyFilter } from './email-content.js';

export const EmailDraftId = Schema.String.check(Schema.isUUID(4));
export const EmailDraftContent = Schema.Struct({
  recipient: Schema.String.check(Schema.isMaxLength(254)),
  reference: Schema.String.check(Schema.isMaxLength(160)),
  subject: Schema.String.check(Schema.isMaxLength(160)),
  body: EmailBody,
  bodyFormat: EmailBodyFormat,
  reminder: Schema.Boolean,
}).check(emailBodyFilter);
export const EmailDraftSave = Schema.Struct({
  ...EmailDraftContent.fields,
  expectedVersion: SafeInteger,
}).check(emailBodyFilter);
export const EmailDraft = Schema.Struct({
  ...EmailDraftContent.fields,
  id: EmailDraftId,
  version: PositiveSafeInteger,
  updatedAt: IsoUtc,
}).check(emailBodyFilter);
export const EmailDraftList = Schema.Array(EmailDraft);
export const EmailDraftArchive = Schema.Struct({ expectedVersion: PositiveSafeInteger });
export class EmailDraftConflict extends Schema.TaggedError<EmailDraftConflict>()(
  'EmailDraftConflict',
  {
    code: Schema.Literal('email_draft.conflict'),
  },
  { httpApiStatus: 409 },
) {}
export class EmailDraftNotFound extends Schema.TaggedError<EmailDraftNotFound>()(
  'EmailDraftNotFound',
  {
    code: Schema.Literal('email_draft.not_found'),
  },
  { httpApiStatus: 404 },
) {}
export const EmailDraftFailure = Schema.Union([
  EmailDraftConflict,
  EmailDraftNotFound,
  AuthenticationRequired,
  PermissionDenied,
  RequestRateLimited,
]);
