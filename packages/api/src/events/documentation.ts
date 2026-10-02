import { InvoiceIssuedCloudEvent } from '@froment/contracts';
import { eventApiDocumentation } from '@froment/l10n';
import { Schema } from 'effect';

const document = Schema.toJsonSchemaDocument(InvoiceIssuedCloudEvent, {
  onExcessProperty: 'error',
});

export const invoiceIssuedEventJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://froment.software/api/events/schemas/software.froment.invoice.issued.v1.json',
  ...document.schema,
  $defs: document.definitions,
};

export const asyncApiSpecification = {
  asyncapi: '3.0.0',
  info: {
    title: eventApiDocumentation.title,
    version: '1.0.0',
    description: eventApiDocumentation.description,
  },
  defaultContentType: 'application/cloudevents+json',
  servers: {
    subscriber: {
      host: '{subscriberHost}',
      pathname: '{subscriberPath}',
      protocol: 'https',
      description: eventApiDocumentation.serverDescription,
      variables: {
        subscriberHost: { default: 'example.com' },
        subscriberPath: { default: '/froment-events' },
      },
    },
  },
  channels: {
    invoiceIssued: {
      address: '{subscriberPath}',
      messages: {
        invoiceIssued: { $ref: '#/components/messages/invoiceIssued' },
      },
      bindings: { http: { method: 'POST' } },
    },
  },
  operations: {
    sendInvoiceIssued: {
      action: 'send',
      channel: { $ref: '#/channels/invoiceIssued' },
      messages: [{ $ref: '#/channels/invoiceIssued/messages/invoiceIssued' }],
    },
  },
  components: {
    messages: {
      invoiceIssued: {
        name: 'software.froment.invoice.issued.v1',
        title: eventApiDocumentation.invoiceIssuedTitle,
        contentType: 'application/cloudevents+json',
        payload: {
          $ref: '/api/events/schemas/software.froment.invoice.issued.v1.json',
        },
      },
    },
  },
};
