import { PRIMARY_OUTLET, type UrlSerializer, type UrlTree } from '@angular/router';
import { Ulid, type LoginModeValue } from '@froment/contracts';
import { Schema } from 'effect';
import { accountRoutes } from '../account-security/account.routes';
import { PortalDocumentKind } from '../client-portal/portal-documents';

export function loginDestination(
  mode: LoginModeValue,
  returnUrl: string | null,
  serializer: UrlSerializer,
): string {
  if (mode !== 'client') return '/dashboard';
  const fallback = '/client';
  if (!returnUrl?.startsWith('/') || returnUrl.startsWith('//') || returnUrl.includes('\\'))
    return fallback;
  let url: UrlTree;
  try {
    url = serializer.parse(returnUrl);
  } catch {
    return fallback;
  }
  const primary = url.root.children[PRIMARY_OUTLET];
  if (!primary || Object.keys(url.root.children).length !== 1 || primary.hasChildren())
    return fallback;
  if (primary.segments.some((segment) => Object.keys(segment.parameters).length > 0))
    return fallback;
  const [client, section, kind, id] = primary.segments.map((segment) => segment.path);
  if (client !== 'client') return fallback;
  const length = primary.segments.length;
  const portal = length === 1;
  const account =
    section === 'account' &&
    (length === 2 || (length === 3 && accountRoutes.some((route) => route.path === kind)));
  const document =
    length === 4 &&
    section === 'documents' &&
    Schema.is(PortalDocumentKind)(kind) &&
    Schema.is(Ulid)(id);
  return portal || account || document ? serializer.serialize(url) : fallback;
}
