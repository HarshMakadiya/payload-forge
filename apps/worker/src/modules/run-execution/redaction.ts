const REDACTED = '[REDACTED]';

export function redactValue(
  value: unknown,
  fields: readonly string[],
  path = ''
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      redactValue(item, fields, `${path}[${index}]`)
    );
  }
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const itemPath = path === '' ? key : `${path}.${key}`;
      const isSensitive = fields.some(
        (field) =>
          field.toLowerCase() === key.toLowerCase() || field === itemPath
      );
      return [
        key,
        isSensitive ? REDACTED : redactValue(item, fields, itemPath),
      ];
    })
  );
}

export function redactBodyText(
  body: string,
  fields: readonly string[]
): string {
  if (fields.length === 0) return body;
  try {
    return JSON.stringify(redactValue(JSON.parse(body) as unknown, fields));
  } catch {
    return body;
  }
}

export function redactUrl(target: string, fields: readonly string[]): string {
  const url = new URL(target);
  for (const field of fields) {
    if (url.searchParams.has(field)) url.searchParams.set(field, REDACTED);
  }
  return url.toString();
}

export function redactLiterals(
  text: string,
  literals: readonly string[]
): string {
  return literals
    .filter((literal) => literal.length >= 4)
    .reduce(
      (redacted, literal) => redacted.split(literal).join(REDACTED),
      text
    );
}
