import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'yaml';

const SUPPORTED_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const MAX_OPERATIONS = 500;

type JsonRecord = Record<string, unknown>;

export interface ParsedOpenApiOperation {
  readonly operationKey: string;
  readonly name: string;
  readonly method: string;
  readonly path: string;
  readonly payloadSample?: unknown;
  readonly payloadSchema?: JsonRecord;
}

export interface ParsedOpenApiDocument {
  readonly title: string;
  readonly version: string;
  readonly operations: readonly ParsedOpenApiOperation[];
  readonly ignoredMethodCount: number;
}

function asRecord(value: unknown): JsonRecord | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as JsonRecord;
}

function resolveLocalReference(
  value: unknown,
  document: JsonRecord
): JsonRecord | undefined {
  const record = asRecord(value);
  const reference = record?.$ref;
  if (typeof reference !== 'string' || !reference.startsWith('#/')) {
    return record;
  }

  let current: unknown = document;
  for (const rawSegment of reference.slice(2).split('/')) {
    const segment = rawSegment.replaceAll('~1', '/').replaceAll('~0', '~');
    current = asRecord(current)?.[segment];
  }
  return asRecord(current);
}

function jsonMediaType(
  content: JsonRecord | undefined
): JsonRecord | undefined {
  if (content === undefined) return undefined;
  const preferred = asRecord(content['application/json']);
  if (preferred !== undefined) return preferred;

  for (const [mediaType, value] of Object.entries(content)) {
    if (mediaType.endsWith('+json')) return asRecord(value);
  }
  return undefined;
}

function firstExample(mediaType: JsonRecord, schema: JsonRecord): unknown {
  if (mediaType.example !== undefined) return mediaType.example;
  const examples = asRecord(mediaType.examples);
  if (examples !== undefined) {
    for (const example of Object.values(examples)) {
      const resolved = asRecord(example);
      if (resolved?.value !== undefined) return resolved.value;
    }
  }
  return schema.example;
}

function bundleSchema(schema: JsonRecord, document: JsonRecord): JsonRecord {
  const sourceSchemas = asRecord(asRecord(document.components)?.schemas) ?? {};
  const definitions: JsonRecord = {};

  const rewrite = (value: unknown, depth: number): unknown => {
    if (depth > 64 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.map((item) => rewrite(item, depth + 1));
    }

    const record = value as JsonRecord;
    const reference = record.$ref;
    if (
      typeof reference === 'string' &&
      reference.startsWith('#/components/schemas/')
    ) {
      const rawName = reference.slice('#/components/schemas/'.length);
      const name = rawName.replaceAll('~1', '/').replaceAll('~0', '~');
      if (!(name in definitions) && sourceSchemas[name] !== undefined) {
        definitions[name] = {};
        definitions[name] = rewrite(sourceSchemas[name], depth + 1);
      }
      const escapedName = name.replaceAll('~', '~0').replaceAll('/', '~1');
      return {
        ...Object.fromEntries(
          Object.entries(record)
            .filter(([key]) => key !== '$ref')
            .map(([key, item]) => [key, rewrite(item, depth + 1)])
        ),
        $ref: `#/$defs/${escapedName}`,
      };
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [
        key,
        rewrite(item, depth + 1),
      ])
    );
  };

  const bundled = rewrite(schema, 0) as JsonRecord;
  return Object.keys(definitions).length === 0
    ? bundled
    : { ...bundled, $defs: definitions };
}

function operationName(
  operation: JsonRecord,
  method: string,
  path: string
): string {
  for (const candidate of [operation.operationId, operation.summary]) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim().slice(0, 160);
    }
  }
  return `${method} ${path}`.slice(0, 160);
}

@Injectable()
export class OpenApiImportService {
  parse(source: string): ParsedOpenApiDocument {
    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch {
      try {
        parsed = parse(source, { maxAliasCount: 100 });
      } catch (caught: unknown) {
        throw new BadRequestException({
          code: 'OPENAPI_PARSE_FAILED',
          message:
            caught instanceof Error
              ? `Could not parse the OpenAPI document: ${caught.message}`
              : 'Could not parse the OpenAPI document',
        });
      }
    }

    const document = asRecord(parsed);
    const version = document?.openapi;
    if (
      document === undefined ||
      typeof version !== 'string' ||
      !version.startsWith('3.')
    ) {
      throw new BadRequestException({
        code: 'OPENAPI_VERSION_UNSUPPORTED',
        message: 'Import requires an OpenAPI 3.x JSON or YAML document',
      });
    }

    const paths = asRecord(document.paths);
    if (paths === undefined) {
      throw new BadRequestException({
        code: 'OPENAPI_PATHS_MISSING',
        message: 'The OpenAPI document does not define any paths',
      });
    }

    const operations: ParsedOpenApiOperation[] = [];
    let ignoredMethodCount = 0;
    for (const [path, rawPathItem] of Object.entries(paths)) {
      const pathItem = resolveLocalReference(rawPathItem, document);
      if (pathItem === undefined || !path.startsWith('/')) continue;

      for (const [key, rawOperation] of Object.entries(pathItem)) {
        if (
          ['head', 'options', 'trace'].includes(key.toLowerCase()) &&
          asRecord(rawOperation) !== undefined
        ) {
          ignoredMethodCount += 1;
        }
      }

      for (const lowerMethod of SUPPORTED_METHODS) {
        const operation = asRecord(pathItem[lowerMethod]);
        if (operation === undefined) continue;

        const method = lowerMethod.toUpperCase();
        const requestBody = resolveLocalReference(
          operation.requestBody,
          document
        );
        const mediaType = jsonMediaType(asRecord(requestBody?.content));
        const rawSchema = asRecord(mediaType?.schema);
        const payloadSchema =
          rawSchema === undefined
            ? undefined
            : bundleSchema(rawSchema, document);
        const payloadSample =
          mediaType === undefined || rawSchema === undefined
            ? undefined
            : firstExample(mediaType, rawSchema);

        operations.push({
          operationKey: `${method} ${path}`,
          name: operationName(operation, method, path),
          method,
          path,
          ...(payloadSchema === undefined ? {} : { payloadSchema }),
          ...(payloadSample === undefined ? {} : { payloadSample }),
        });

        if (operations.length > MAX_OPERATIONS) {
          throw new BadRequestException({
            code: 'OPENAPI_TOO_MANY_OPERATIONS',
            message: `OpenAPI import supports at most ${MAX_OPERATIONS} operations at once`,
          });
        }
      }
    }

    if (operations.length === 0) {
      throw new BadRequestException({
        code: 'OPENAPI_NO_SUPPORTED_OPERATIONS',
        message:
          'No GET, POST, PUT, PATCH, or DELETE operations were found in the document',
      });
    }

    const info = asRecord(document.info);
    return {
      title:
        typeof info?.title === 'string' && info.title.trim() !== ''
          ? info.title.trim()
          : 'Untitled API',
      version,
      operations,
      ignoredMethodCount,
    };
  }
}
