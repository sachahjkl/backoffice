import {
  InvoiceIssuedCloudEvent,
  type InvoiceIssuedEventData,
  type InvoiceIssuedCloudEvent as InvoiceIssuedCloudEventValue,
} from '@froment/contracts';
import { Context, DateTime, Effect, Fiber, Layer, Option, Schema } from 'effect';
import { v7 as uuidv7 } from 'uuid';

import { Database, DatabaseError } from '../database/database.js';
import { RequestContext } from '../http/request-context.js';

export interface EventOutboxService {
  readonly installationId: string;
  readonly insertInvoiceIssued: (
    data: InvoiceIssuedEventData,
    occurredAt: number,
  ) => InvoiceIssuedCloudEventValue;
}

export class EventOutbox extends Context.Service<EventOutbox, EventOutboxService>()(
  '@froment/api/EventOutbox',
) {}

export const EventOutboxLive = Layer.effect(
  EventOutbox,
  Effect.gen(function* () {
    const database = yield* Database;
    const initializedAt = yield* DateTime.now;
    const installationId = yield* Effect.try({
      try: () =>
        database.sqlite
          .transaction(() => {
            const existing = database.sqlite
              .prepare('select installation_id from event_installation where singleton = 1')
              .pluck()
              .get();
            if (existing !== undefined) return Schema.decodeUnknownSync(Schema.String)(existing);
            const generated = uuidv7();
            database.sqlite
              .prepare(
                'insert into event_installation (singleton, installation_id, created_at) values (1, ?, ?)',
              )
              .run(generated, DateTime.toEpochMillis(initializedAt));
            return generated;
          })
          .immediate(),
      catch: (cause) => new DatabaseError({ operation: 'initialize.event.outbox', cause }),
    });
    const insert = database.sqlite.prepare(
      `insert into outbox_events
       (id, event_type, subject, content, occurred_at, dispatched_at)
       values (?, ?, ?, ?, ?, null)`,
    );

    const insertInvoiceIssued = (
      data: InvoiceIssuedEventData,
      occurredAt: number,
    ): InvoiceIssuedCloudEventValue => {
      const fiber = Fiber.getCurrent();
      const requestContext =
        fiber === undefined
          ? undefined
          : Option.getOrUndefined(Context.getOption(fiber.context, RequestContext));
      const base = {
        specversion: '1.0',
        id: uuidv7(),
        source: `urn:froment:installation:${installationId}`,
        type: 'software.froment.invoice.issued.v1',
        subject: `invoice/${data.invoiceId}`,
        time: DateTime.formatIso(DateTime.makeUnsafe(occurredAt)),
        datacontenttype: 'application/json',
        dataschema:
          'https://froment.software/api/events/schemas/software.froment.invoice.issued.v1.json',
        correlationid: requestContext?.correlationId ?? uuidv7(),
        causationid: requestContext?.causationId ?? uuidv7(),
        data,
      };
      const event = Schema.decodeUnknownSync(InvoiceIssuedCloudEvent)(
        requestContext === undefined
          ? base
          : {
              ...base,
              traceparent: `00-${requestContext.traceId}-${requestContext.spanId}-01`,
            },
      );
      insert.run(event.id, event.type, event.subject, JSON.stringify(event), occurredAt);
      return event;
    };

    return EventOutbox.of({ installationId, insertInvoiceIssued });
  }),
);
