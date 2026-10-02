import { Context, Effect, Layer, Schema } from 'effect';
import { lookup, type LookupAddress, type LookupOptions } from 'node:dns';
import { request as requestHttp } from 'node:http';
import { request as requestHttps } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { clearTimeout, setTimeout } from 'node:timers';

import { RuntimeConfiguration } from '../runtime-config.js';

export class WebhookTransportError extends Schema.TaggedError<WebhookTransportError>()(
  'WebhookTransportError',
  { reason: Schema.Literals(['destination', 'network', 'verification']) },
) {}

export interface WebhookTransportService {
  readonly verify: (url: string, challenge: string) => Effect.Effect<void, WebhookTransportError>;
  readonly deliver: (
    url: string,
    body: Uint8Array,
    signature: string,
  ) => Effect.Effect<number, WebhookTransportError>;
}

export class WebhookTransport extends Context.Service<WebhookTransport, WebhookTransportService>()(
  '@froment/api/WebhookTransport',
) {}

const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv6');
}

export const isWebhookAddressAllowed = (address: string): boolean => {
  const family = isIP(address);
  if (family === 0) return false;
  return !blockedAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4');
};

const makeLookup =
  (allowPrivate: boolean) =>
  (
    hostname: string,
    options: LookupOptions,
    callback: (
      error: NodeJS.ErrnoException | null,
      address: string | Array<LookupAddress>,
      family?: number,
    ) => void,
  ) => {
    lookup(
      hostname,
      { all: true, verbatim: true, family: options.family, hints: options.hints },
      (error, addresses) => {
        if (error !== null) {
          callback(error, '', 0);
          return;
        }
        const allowed = allowPrivate
          ? addresses
          : addresses.filter(({ address }) => isWebhookAddressAllowed(address));
        const first = allowed.at(0);
        if (first === undefined) {
          const denied = Object.assign(new Error('webhook.destination_address_denied'), {
            code: 'EACCES',
          });
          callback(denied, '', 0);
          return;
        }
        if (options.all) callback(null, allowed);
        else callback(null, first.address, first.family);
      },
    );
  };

export const WebhookTransportLive = Layer.effect(
  WebhookTransport,
  Effect.gen(function* () {
    const runtime = yield* RuntimeConfiguration;
    const allowHttp =
      runtime.webhooks.allowPrivateDestinations &&
      runtime.application.appEnvironment !== 'production';
    const validateUrl = (text: string): URL => {
      const url = new URL(text);
      if (url.username !== '' || url.password !== '' || url.hash !== '')
        throw new WebhookTransportError({ reason: 'destination' });
      if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:'))
        throw new WebhookTransportError({ reason: 'destination' });
      const hostname = url.hostname.replace(/^\[|\]$/g, '');
      if (
        isIP(hostname) !== 0 &&
        !runtime.webhooks.allowPrivateDestinations &&
        !isWebhookAddressAllowed(hostname)
      )
        throw new WebhookTransportError({ reason: 'destination' });
      return url;
    };
    const send = (
      urlText: string,
      method: 'HEAD' | 'POST',
      headers: Readonly<Record<string, string>>,
      body?: Uint8Array,
    ): Effect.Effect<
      { readonly status: number; readonly headers: NodeJS.Dict<string | string[]> },
      WebhookTransportError
    > =>
      Effect.callback((resume) => {
        let url: URL;
        try {
          url = validateUrl(urlText);
        } catch {
          resume(Effect.fail(new WebhookTransportError({ reason: 'destination' })));
          return;
        }
        const makeRequest = url.protocol === 'https:' ? requestHttps : requestHttp;
        const request = makeRequest(
          url,
          {
            method,
            headers,
            lookup: makeLookup(runtime.webhooks.allowPrivateDestinations),
          },
          (response) => {
            clearTimeout(deadline);
            const status = response.statusCode ?? 0;
            const responseHeaders = response.headers;
            response.destroy();
            resume(Effect.succeed({ status, headers: responseHeaders }));
          },
        );
        const deadline = setTimeout(
          () => request.destroy(new Error('webhook.request_timeout')),
          runtime.webhooks.requestTimeoutMillis,
        );
        request.once('error', () => {
          clearTimeout(deadline);
          resume(Effect.fail(new WebhookTransportError({ reason: 'network' })));
        });
        if (body !== undefined) request.write(body);
        request.end();
        return Effect.sync(() => {
          clearTimeout(deadline);
          request.destroy();
        });
      });

    const verify = Effect.fn('WebhookTransport.verify')(function* (url: string, challenge: string) {
      const response = yield* send(url, 'HEAD', {
        'froment-webhook-verification': challenge,
        'user-agent': 'Froment-Webhook/1.0',
      });
      const echoed = response.headers['froment-webhook-verification'];
      if (response.status < 200 || response.status >= 300 || echoed !== challenge)
        return yield* new WebhookTransportError({ reason: 'verification' });
    });
    const deliver = Effect.fn('WebhookTransport.deliver')(function* (
      url: string,
      body: Uint8Array,
      signature: string,
    ) {
      const response = yield* send(
        url,
        'POST',
        {
          'content-type': 'application/cloudevents+json',
          'content-length': String(body.byteLength),
          'froment-signature': signature,
          'user-agent': 'Froment-Webhook/1.0',
        },
        body,
      );
      return response.status;
    });
    return WebhookTransport.of({ verify, deliver });
  }),
);
