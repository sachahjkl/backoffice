import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';

import { ApiBrowserRequest, ApiRequestBody } from '../api-authentication.js';
import { authenticate } from '../api-policy/authentication.js';
import { requirePermissions } from '../api-policy/permissions.js';
import { rateLimit, RateLimits } from '../api-policy/rate-limit.js';
import { frontendSpecific } from '../api-policy/visibility.js';
import { Permissions } from '../permissions.js';
import {
  WebhookConflict,
  WebhookDeliveryId,
  WebhookDeliveryList,
  WebhookExpectedVersion,
  WebhookInvalid,
  WebhookNotFound,
  WebhookSecretRotated,
  WebhookSubscription,
  WebhookSubscriptionCreate,
  WebhookSubscriptionCreated,
  WebhookSubscriptionId,
  WebhookSubscriptionList,
  WebhookSubscriptionUpdate,
  WebhookUnavailable,
  WebhookDelivery,
} from './contracts.js';
import {
  AuthenticationRequired,
  PermissionDenied,
  RequestRateLimited,
} from '../authentication/contracts.js';
import { Schema } from 'effect';

const WebhookFailure = Schema.Union([
  AuthenticationRequired,
  PermissionDenied,
  RequestRateLimited,
  WebhookNotFound,
  WebhookConflict,
  WebhookInvalid,
  WebhookUnavailable,
]);

export class WebhooksApi extends HttpApiGroup.make('webhooks', { topLevel: true })
  .add(
    HttpApiEndpoint.get('webhookSubscriptionList', '/api/webhooks/subscriptions', {
      success: WebhookSubscriptionList,
      error: WebhookFailure.members,
    }).pipe(
      requirePermissions([Permissions.webhookSubscriptionRead]),
      authenticate,
      frontendSpecific,
    ),
  )
  .add(
    HttpApiEndpoint.post('webhookSubscriptionCreate', '/api/webhooks/subscriptions', {
      payload: WebhookSubscriptionCreate,
      success: WebhookSubscriptionCreated,
      error: WebhookFailure.members,
    })
      .middleware(ApiRequestBody)
      .middleware(ApiBrowserRequest)
      .pipe(
        requirePermissions([Permissions.webhookSubscriptionManage]),
        authenticate,
        rateLimit(RateLimits.tenPerMinute),
        frontendSpecific,
      ),
  )
  .add(
    HttpApiEndpoint.put(
      'webhookSubscriptionUpdate',
      '/api/webhooks/subscriptions/:subscriptionId',
      {
        params: { subscriptionId: WebhookSubscriptionId },
        payload: WebhookSubscriptionUpdate,
        success: WebhookSubscription,
        error: WebhookFailure.members,
      },
    )
      .middleware(ApiRequestBody)
      .middleware(ApiBrowserRequest)
      .pipe(
        requirePermissions([Permissions.webhookSubscriptionManage]),
        authenticate,
        rateLimit(RateLimits.tenPerMinute),
        frontendSpecific,
      ),
  )
  .add(
    HttpApiEndpoint.post(
      'webhookSubscriptionRotateSecret',
      '/api/webhooks/subscriptions/:subscriptionId/rotate-secret',
      {
        params: { subscriptionId: WebhookSubscriptionId },
        payload: WebhookExpectedVersion,
        success: WebhookSecretRotated,
        error: WebhookFailure.members,
      },
    )
      .middleware(ApiRequestBody)
      .middleware(ApiBrowserRequest)
      .pipe(
        requirePermissions([Permissions.webhookSubscriptionManage]),
        authenticate,
        rateLimit(RateLimits.tenPerMinute),
        frontendSpecific,
      ),
  )
  .add(
    HttpApiEndpoint.get('webhookDeliveryList', '/api/webhooks/deliveries', {
      success: WebhookDeliveryList,
      error: WebhookFailure.members,
    }).pipe(requirePermissions([Permissions.webhookDeliveryRead]), authenticate, frontendSpecific),
  )
  .add(
    HttpApiEndpoint.post('webhookDeliveryReplay', '/api/webhooks/deliveries/:deliveryId/replay', {
      params: { deliveryId: WebhookDeliveryId },
      payload: Schema.Struct({}),
      success: WebhookDelivery,
      error: WebhookFailure.members,
    })
      .middleware(ApiRequestBody)
      .middleware(ApiBrowserRequest)
      .pipe(
        requirePermissions([Permissions.webhookDeliveryReplay]),
        authenticate,
        rateLimit(RateLimits.tenPerMinute),
        frontendSpecific,
      ),
  ) {}
