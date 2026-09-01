export function parsePayloadImport(
  source: string
): readonly Record<string, unknown>[] {
  if (source.trim() === '') {
    throw new Error(
      'Paste a JSON object or an array of JSON objects to import.'
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid import JSON: ${error instanceof Error ? error.message : 'Syntax error'}`
    );
  }

  const payloads = Array.isArray(parsed) ? parsed : [parsed];
  if (payloads.length === 0) {
    throw new Error('Imported payload batch cannot be empty.');
  }
  if (payloads.length > 10_000) {
    throw new Error('Imported payload batch cannot exceed 10,000 items.');
  }

  return payloads.map((payload, index) => {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new Error(`Payload ${index + 1} must be a JSON object.`);
    }
    return payload as Record<string, unknown>;
  });
}

export function serializeImportedPayloads(
  payloads: readonly Record<string, unknown>[]
): string {
  return JSON.stringify(payloads, null, 2);
}
