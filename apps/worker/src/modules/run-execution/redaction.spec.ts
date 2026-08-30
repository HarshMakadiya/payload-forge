import { describe, expect, it } from 'vitest';
import {
  redactBodyText,
  redactLiterals,
  redactUrl,
  redactValue,
} from './redaction.js';

describe('request log redaction', () => {
  it('redacts configured nested fields without mutating the source', () => {
    const source = { profile: { email: 'person@example.test', age: 30 } };

    expect(redactValue(source, ['profile.email'])).toEqual({
      profile: { email: '[REDACTED]', age: 30 },
    });
    expect(source.profile.email).toBe('person@example.test');
  });

  it('leaves non-JSON response bodies unchanged', () => {
    expect(redactBodyText('plain response', ['token'])).toBe('plain response');
  });

  it('redacts configured query parameters', () => {
    expect(
      redactUrl('https://example.test/orders?token=secret&page=1', ['token'])
    ).toBe('https://example.test/orders?token=%5BREDACTED%5D&page=1');
  });

  it('redacts secret literals in non-JSON bodies', () => {
    expect(redactLiterals('echo Bearer-secret', ['Bearer-secret'])).toBe(
      'echo [REDACTED]'
    );
  });
});
