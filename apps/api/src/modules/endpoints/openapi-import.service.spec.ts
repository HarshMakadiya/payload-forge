import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { OpenApiImportService } from './openapi-import.service.js';

describe('OpenApiImportService', () => {
  const service = new OpenApiImportService();

  it('extracts supported operations and bundles request schema references', () => {
    const result = service.parse(
      JSON.stringify({
        openapi: '3.1.0',
        info: { title: 'Orders', version: '1.0.0' },
        paths: {
          '/orders': {
            post: {
              operationId: 'createOrder',
              requestBody: {
                content: {
                  'application/json': {
                    example: { quantity: 2 },
                    schema: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
            options: { responses: {} },
          },
        },
        components: {
          schemas: {
            Order: {
              type: 'object',
              properties: { quantity: { type: 'integer' } },
            },
          },
        },
      })
    );

    expect(result).toMatchObject({
      title: 'Orders',
      version: '3.1.0',
      ignoredMethodCount: 1,
      operations: [
        {
          operationKey: 'POST /orders',
          name: 'createOrder',
          method: 'POST',
          path: '/orders',
          payloadSample: { quantity: 2 },
          payloadSchema: {
            $ref: '#/$defs/Order',
            $defs: {
              Order: {
                type: 'object',
                properties: { quantity: { type: 'integer' } },
              },
            },
          },
        },
      ],
    });
  });

  it('parses YAML documents and falls back to the operation summary', () => {
    const result = service.parse(`
openapi: 3.0.3
info:
  title: Catalog
paths:
  /items/{id}:
    get:
      summary: Read an item
      responses:
        '200':
          description: OK
`);

    expect(result.operations[0]).toMatchObject({
      operationKey: 'GET /items/{id}',
      name: 'Read an item',
      method: 'GET',
      path: '/items/{id}',
    });
  });

  it('rejects documents outside OpenAPI 3.x', () => {
    expect(() => service.parse('{"swagger":"2.0","paths":{}}')).toThrow(
      BadRequestException
    );
  });
});
