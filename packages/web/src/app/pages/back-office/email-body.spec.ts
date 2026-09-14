import { parseDocumentText } from '@froment/contracts';
import { convertEmailBody } from './email-body';

describe('email body conversion', () => {
  it('converts plain text to structured blocks and back', () => {
    const plain = 'Bonjour **sans interprétation**.\n\nDeuxième paragraphe.';
    const formatted = convertEmailBody(plain, 'plain', 'blocks');

    expect(parseDocumentText(formatted, 'blocks')).toHaveLength(2);
    expect(convertEmailBody(formatted, 'blocks', 'plain')).toBe(plain);
  });
});
