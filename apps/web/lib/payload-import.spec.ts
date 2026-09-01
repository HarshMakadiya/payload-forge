import { describe, expect, it } from 'vitest';
import {
  parsePayloadImport,
  serializeImportedPayloads,
} from './payload-import';

describe('parsePayloadImport', () => {
  it('normalizes one JSON object into a one-item payload batch', () => {
    expect(parsePayloadImport('{"id": 1}')).toEqual([{ id: 1 }]);
  });

  it('accepts an externally generated array of payload objects', () => {
    expect(parsePayloadImport('[{"id": 1}, {"id": 2}]')).toEqual([
      { id: 1 },
      { id: 2 },
    ]);
  });

  it('rejects empty batches and non-object payloads', () => {
    expect(() => parsePayloadImport('[]')).toThrow(
      'Imported payload batch cannot be empty.'
    );
    expect(() => parsePayloadImport('["not an object"]')).toThrow(
      'Payload 1 must be a JSON object.'
    );
  });

  it('serializes every imported payload for preview and copy', () => {
    const payloads = Array.from({ length: 10 }, (_, index) => ({
      incomingImageId: index + 1,
    }));

    const preview = JSON.parse(
      serializeImportedPayloads(payloads)
    ) as unknown[];

    expect(preview).toHaveLength(10);
    expect(preview[9]).toEqual({ incomingImageId: 10 });
  });
});
