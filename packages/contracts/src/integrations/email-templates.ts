import { Schema } from 'effect';
import { SafeInteger, PositiveSafeInteger } from '../documents/lines.js';
import {
  AuthenticationRequired,
  PermissionDenied,
  RequestRateLimited,
} from '../authentication/contracts.js';
import { IsoUtc } from '../temporal.js';
import { EmailBody, EmailBodyFormat, emailBodyFilter } from './email-content.js';

export const EmailTemplateId = Schema.String.check(Schema.isUUID(4));
export const EmailTemplateContent = Schema.Struct({
  subject: Schema.String.check(Schema.isPattern(/\S/), Schema.isMaxLength(160)),
  body: EmailBody.check(Schema.isPattern(/\S/)),
  bodyFormat: EmailBodyFormat,
}).check(emailBodyFilter);
export const EmailTemplateSave = Schema.Struct({
  ...EmailTemplateContent.fields,
  expectedVersion: SafeInteger,
}).check(emailBodyFilter);
export const EmailTemplate = Schema.Struct({
  ...EmailTemplateContent.fields,
  id: EmailTemplateId,
  version: PositiveSafeInteger,
  updatedAt: IsoUtc,
}).check(emailBodyFilter);
export const EmailTemplateList = Schema.Array(EmailTemplate);
export const EmailTemplateArchive = Schema.Struct({ expectedVersion: PositiveSafeInteger });
export class EmailTemplateConflict extends Schema.TaggedError<EmailTemplateConflict>()(
  'EmailTemplateConflict',
  {
    code: Schema.Literal('email_template.conflict'),
  },
  { httpApiStatus: 409 },
) {}
export class EmailTemplateNotFound extends Schema.TaggedError<EmailTemplateNotFound>()(
  'EmailTemplateNotFound',
  {
    code: Schema.Literal('email_template.not_found'),
  },
  { httpApiStatus: 404 },
) {}
export const EmailTemplateFailure = Schema.Union([
  EmailTemplateConflict,
  EmailTemplateNotFound,
  AuthenticationRequired,
  PermissionDenied,
  RequestRateLimited,
]);
