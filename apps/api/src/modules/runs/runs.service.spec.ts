import type { TestRunSnapshot } from '@payload-forge/shared';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RunsService } from './runs.service.js';

describe('RunsService control', () => {
  it('rejects a missing run', async () => {
    const service = new RunsService(
      { testRun: { findUnique: vi.fn().mockResolvedValue(null) } } as never,
      {} as never
    );
    await expect(service.control('missing', 'pause')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('rejects an invalid status transition', async () => {
    const service = new RunsService(
      {
        testRun: {
          findUnique: vi.fn().mockResolvedValue({ status: 'COMPLETED' }),
        },
      } as never,
      {} as never
    );
    await expect(service.control('run-1', 'pause')).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('publishes and persists a valid pause', async () => {
    const update = vi.fn().mockResolvedValue({ status: 'PAUSED' });
    const control = vi.fn().mockResolvedValue(undefined);
    const service = new RunsService(
      {
        testRun: {
          findUnique: vi.fn().mockResolvedValue({ status: 'RUNNING' }),
          update,
        },
      } as never,
      { control } as never
    );

    await service.control('run-1', 'pause');
    expect(control).toHaveBeenCalledWith('run-1', 'pause');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: 'PAUSED' },
    });
  });
});

describe('RunsService create', () => {
  const input = {
    projectId: '11111111-1111-4111-8111-111111111111',
    environmentId: '22222222-2222-4222-8222-222222222222',
    endpointId: '33333333-3333-4333-8333-333333333333',
    totalLogicalRequests: 60,
    durationMinutes: 1,
    rateStrategy: 'constant' as const,
    maxConcurrency: 5,
    ownershipAcknowledged: true,
  };

  const createService = (environmentKind: 'DEVELOPMENT' | 'PRODUCTION') => {
    const create = vi.fn().mockResolvedValue({ id: 'run-1' });
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const environment = {
      projectId: input.projectId,
      kind: environmentKind,
      baseUrl: 'https://api.example.test',
      variables: { tenant: 'demo' },
      encryptedSecrets: { token: 'encrypted' },
    };
    const endpoint = {
      id: input.endpointId,
      projectId: input.projectId,
      method: 'POST',
      path: '/orders/{{tenant}}',
      headers: { 'x-tenant': '{{tenant}}' },
      timeoutMs: 5_000,
      payloadSample: { order: 'sample' },
    };
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({ redactFields: ['token'] }),
      },
      environment: { findUnique: vi.fn().mockResolvedValue(environment) },
      endpoint: { findUnique: vi.fn().mockResolvedValue(endpoint) },
      payloadTemplate: { findUnique: vi.fn() },
      testRun: { create },
    };

    return {
      service: new RunsService(prisma as never, { enqueue } as never),
      create,
      enqueue,
    };
  };

  it('requires target authorization before persisting or queueing a run', async () => {
    const { service, create, enqueue } = createService('DEVELOPMENT');

    await expect(
      service.create({ ...input, ownershipAcknowledged: false })
    ).rejects.toThrow(
      'Confirm that you own or are authorized to test this target'
    );
    expect(create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('requires explicit production confirmation', async () => {
    const { service, create, enqueue } = createService('PRODUCTION');

    await expect(service.create(input)).rejects.toThrow(
      'Production Test Runs require explicit confirmation'
    );
    expect(create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('persists and queues a resolved, authorized run snapshot', async () => {
    const { service, create, enqueue } = createService('DEVELOPMENT');

    await expect(service.create(input)).resolves.toEqual({ id: 'run-1' });
    expect(create).toHaveBeenCalledOnce();
    expect(enqueue).toHaveBeenCalledOnce();
    const [snapshot, encryptedSecrets] = enqueue.mock.calls[0] as [
      TestRunSnapshot,
      Record<string, string>,
    ];
    expect(snapshot.endpoint.url).toBe('https://api.example.test/orders/demo');
    expect(snapshot.endpoint.headers).toEqual({ 'x-tenant': 'demo' });
    expect(snapshot.targetAuthorizationAcknowledged).toBe(true);
    expect(snapshot.productionConfirmed).toBe(false);
    expect(encryptedSecrets).toEqual({ token: 'encrypted' });
  });
});
