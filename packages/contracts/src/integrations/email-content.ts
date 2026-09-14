import { Schema } from 'effect';
import { isDocumentText } from '../documents/document-text.js';

export const EmailBodyFormat = Schema.Literals(['plain', 'blocks']);
export type EmailBodyFormat = typeof EmailBodyFormat.Type;

export const EmailBody = Schema.String.check(Schema.isMaxLength(20000));

export const emailBodyFilter = Schema.makeFilter<{
  readonly body: string;
  readonly bodyFormat: EmailBodyFormat;
}>((value) => isDocumentText(value.body, value.bodyFormat) || 'email.body_format.invalid');
