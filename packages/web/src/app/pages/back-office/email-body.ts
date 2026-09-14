import {
  documentTextContent,
  parseDocumentText,
  serializeDocumentText,
  type DocumentTextPresentationValue,
  type EmailBodyFormat,
} from '@froment/contracts';

export const emailBodyPresentation = (format: EmailBodyFormat): DocumentTextPresentationValue => ({
  format,
  placement: 'inline',
});

export const convertEmailBody = (
  source: string,
  current: EmailBodyFormat,
  next: EmailBodyFormat,
): string => {
  if (current === next) return source;
  if (next === 'blocks') return serializeDocumentText(parseDocumentText(source, 'plain'));
  return documentTextContent(source, emailBodyPresentation('blocks'));
};
