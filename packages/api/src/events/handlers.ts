import { Api, ApiPrincipal } from '@froment/contracts';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';

import { setPrivateResponseHeaders } from '../http/response.js';
import { Webhooks } from './webhooks.js';

export const WebhookHandlers = HttpApiBuilder.group(Api, 'webhooks', (handlers) =>
  Effect.gen(function* () {
    const webhooks = yield* Webhooks;
    return handlers
      .handle('webhookSubscriptionList', () =>
        setPrivateResponseHeaders.pipe(
          Effect.andThen(webhooks.listSubscriptions),
          Effect.catchTag('DatabaseError', Effect.orDie),
        ),
      )
      .handle('webhookSubscriptionCreate', ({ payload }) =>
        Effect.gen(function* () {
          yield* setPrivateResponseHeaders;
          return yield* webhooks
            .createSubscription(payload, (yield* ApiPrincipal).userId)
            .pipe(Effect.catchTag('DatabaseError', Effect.orDie));
        }),
      )
      .handle('webhookSubscriptionUpdate', ({ params, payload }) =>
        setPrivateResponseHeaders.pipe(
          Effect.andThen(webhooks.updateSubscription(params.subscriptionId, payload)),
          Effect.catchTag('DatabaseError', Effect.orDie),
        ),
      )
      .handle('webhookSubscriptionRotateSecret', ({ params, payload }) =>
        setPrivateResponseHeaders.pipe(
          Effect.andThen(webhooks.rotateSecret(params.subscriptionId, payload.expectedVersion)),
          Effect.catchTag('DatabaseError', Effect.orDie),
        ),
      )
      .handle('webhookDeliveryList', () =>
        setPrivateResponseHeaders.pipe(
          Effect.andThen(webhooks.listDeliveries),
          Effect.catchTag('DatabaseError', Effect.orDie),
        ),
      )
      .handle('webhookDeliveryReplay', ({ params }) =>
        setPrivateResponseHeaders.pipe(
          Effect.andThen(webhooks.replay(params.deliveryId)),
          Effect.catchTag('DatabaseError', Effect.orDie),
        ),
      );
  }),
);
