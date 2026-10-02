import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import { AuditActions } from '../audit/contracts.js';
import { PublicBusinessEventTypes, WebhookSubscriptionCreate } from './contracts.js';

describe('public event contracts', () => {
  it('maps every public business event to an existing audit action', () => {
    const actions = new Set(AuditActions);
    for (const type of PublicBusinessEventTypes) {
      const action = type.slice('software.froment.'.length, -'.v1'.length);
      expect(actions.has(action as (typeof AuditActions)[number])).toBe(true);
    }
  });

  it('accepts one subscription containing every public event type', () => {
    const eventTypes = ['software.froment.invoice.issued.v1' as const, ...PublicBusinessEventTypes];
    expect(
      Schema.decodeUnknownSync(WebhookSubscriptionCreate)({
        requestId: 'c2e82cc5-9fd8-4490-a13f-680fa743ce23',
        name: 'All business events',
        url: 'https://events.example.test/froment',
        eventTypes,
      }).eventTypes,
    ).toEqual(eventTypes);
  });
});
