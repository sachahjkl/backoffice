import { DefaultUrlSerializer } from '@angular/router';
import { loginDestination } from './login-navigation';

describe('loginDestination', () => {
  const serializer = new DefaultUrlSerializer();
  const id = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

  it.each([
    '/client',
    '/client?quote=' + id,
    '/client/account',
    '/client/account/security',
    '/client/account/passkeys',
    '/client/account/sessions',
    '/client/account/preferences',
    ...['quote', 'order', 'invoice'].map(
      (kind) => `/client/documents/${kind}/${id}?q=audit#document`,
    ),
  ])('preserves the internal client destination %s', (url) => {
    expect(loginDestination('client', url, serializer)).toBe(url);
  });

  it.each([
    null,
    'https://example.test/client',
    '//example.test/client',
    '/\\example.test/client',
    '/%2F%2Fexample.test/client',
    'javascript:alert(1)',
    '/client-other',
    '/clients',
    '/client/account/unknown',
    '/client;external=1',
    '/client(aux:backoffice/dashboard)',
    '/client/documents/quote/invalid',
    `/client/documents/refund/${id}`,
    `/client/documents/quote/${id}/edit`,
    '/client?malformed=%',
  ])('rejects an external or unsupported destination %s', (url) => {
    expect(loginDestination('client', url, serializer)).toBe('/client');
  });

  it('keeps administrator sign-in separate from client destinations', () => {
    expect(loginDestination('administrator', '/client', serializer)).toBe('/dashboard');
  });
});
