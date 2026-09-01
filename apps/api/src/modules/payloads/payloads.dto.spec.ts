import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { SavePayloadTemplateDto } from './payloads.dto.js';

describe('SavePayloadTemplateDto', () => {
  it('preserves imported request-body objects during API validation', async () => {
    Reflect.defineMetadata(
      'design:type',
      Array,
      SavePayloadTemplateDto.prototype,
      'payloads'
    );
    const pipe = new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
    });
    const payloads = [
      {
        incomingImageId: 7036,
        sourceType: 'EScript',
        blobUrl:
          'https://stdeautomdeveus001.blob.core.windows.net/de-automation/EScript/1092/1092.json',
      },
    ];

    const result: unknown = await pipe.transform(
      {
        projectId: '3d1d9b9b-c76e-40dd-a535-3d008ac786d9',
        endpointId: 'ba4187fa-f36c-4442-b602-925255c90bbf',
        name: 'Imported payloads',
        payloads,
        source: 'IMPORTED',
      },
      {
        type: 'body',
        metatype: SavePayloadTemplateDto,
        data: '',
      }
    );

    expect((result as SavePayloadTemplateDto).payloads).toEqual(payloads);
  });
});
