import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EndpointsController } from '../endpoints/endpoints.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { EnvironmentsController } from './environments.controller.js';
import { ProjectsController } from './projects.controller.js';
import type { SecretsService } from './secrets.service.js';

describe('configuration CRUD controllers', () => {
  it('updates a Project without overwriting omitted values', async () => {
    const project = {
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'project-1' }),
      update: vi.fn().mockResolvedValue({ id: 'project-1', name: 'Renamed' }),
    };
    const controller = new ProjectsController({
      project,
    } as unknown as PrismaService);

    await expect(
      controller.update('project-1', { name: 'Renamed' })
    ).resolves.toEqual({
      data: { id: 'project-1', name: 'Renamed' },
      error: null,
    });
    expect(project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: { name: 'Renamed' },
    });
  });

  it('blocks Project deletion while a Test Run is active', async () => {
    const project = {
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'p' }),
    };
    const testRun = { findFirst: vi.fn().mockResolvedValue({ id: 'run-1' }) };
    const controller = new ProjectsController({
      project,
      testRun,
    } as unknown as PrismaService);

    await expect(controller.remove('p')).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it('soft-deletes an inactive Project', async () => {
    const project = {
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'p' }),
      update: vi.fn().mockResolvedValue({ id: 'p', deletedAt: new Date() }),
    };
    const testRun = { findFirst: vi.fn().mockResolvedValue(null) };
    const controller = new ProjectsController({
      project,
      testRun,
    } as unknown as PrismaService);
    const deletedAt = new Date('2026-08-30T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(deletedAt);

    try {
      await controller.remove('p');
    } finally {
      vi.useRealTimers();
    }

    expect(project.update).toHaveBeenCalledWith({
      where: { id: 'p' },
      data: { deletedAt },
    });
  });

  it('updates Environment secrets without returning them', async () => {
    const environment = {
      update: vi
        .fn()
        .mockResolvedValue({ id: 'environment-1', name: 'Staging' }),
    };
    const secrets = { encrypt: vi.fn().mockReturnValue('encrypted-secrets') };
    const controller = new EnvironmentsController(
      { environment } as unknown as PrismaService,
      secrets as unknown as SecretsService
    );

    await expect(
      controller.update('environment-1', {
        name: 'Staging',
        secrets: { authorization: 'Bearer replacement' },
      })
    ).resolves.toEqual({
      data: { id: 'environment-1', name: 'Staging' },
      error: null,
    });
    expect(secrets.encrypt).toHaveBeenCalledWith({
      authorization: 'Bearer replacement',
    });
    expect(environment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'environment-1' },
        data: { name: 'Staging', encryptedSecrets: 'encrypted-secrets' },
      })
    );
  });

  it('blocks Environment deletion when a Test Run references it', async () => {
    const testRun = { findFirst: vi.fn().mockResolvedValue({ id: 'run-1' }) };
    const controller = new EnvironmentsController(
      { testRun } as unknown as PrismaService,
      {} as SecretsService
    );

    await expect(controller.remove('environment-1')).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it('deletes an unused Environment without selecting encrypted secrets', async () => {
    const environment = {
      delete: vi.fn().mockResolvedValue({ id: 'environment-1' }),
    };
    const testRun = { findFirst: vi.fn().mockResolvedValue(null) };
    const controller = new EnvironmentsController(
      { environment, testRun } as unknown as PrismaService,
      {} as SecretsService
    );

    await expect(controller.remove('environment-1')).resolves.toEqual({
      data: { id: 'environment-1' },
      error: null,
    });
    expect(environment.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'environment-1' } })
    );
  });

  it('updates Endpoint fields and leaves omitted fields unchanged', async () => {
    const endpoint = {
      update: vi
        .fn()
        .mockResolvedValue({ id: 'endpoint-1', path: '/v2/orders' }),
    };
    const controller = new EndpointsController({
      endpoint,
    } as unknown as PrismaService);

    await expect(
      controller.update('endpoint-1', {
        path: '/v2/orders',
        timeoutMs: 10_000,
      })
    ).resolves.toEqual({
      data: { id: 'endpoint-1', path: '/v2/orders' },
      error: null,
    });
    expect(endpoint.update).toHaveBeenCalledWith({
      where: { id: 'endpoint-1' },
      data: { path: '/v2/orders', timeoutMs: 10_000 },
    });
  });

  it('deletes an unused Endpoint', async () => {
    const endpoint = {
      delete: vi.fn().mockResolvedValue({ id: 'endpoint-1' }),
    };
    const testRun = { findFirst: vi.fn().mockResolvedValue(null) };
    const controller = new EndpointsController({
      endpoint,
      testRun,
    } as unknown as PrismaService);

    await expect(controller.remove('endpoint-1')).resolves.toEqual({
      data: { id: 'endpoint-1' },
      error: null,
    });
    expect(endpoint.delete).toHaveBeenCalledWith({
      where: { id: 'endpoint-1' },
    });
  });

  it('blocks Endpoint deletion when a Test Run references it', async () => {
    const testRun = { findFirst: vi.fn().mockResolvedValue({ id: 'run-1' }) };
    const controller = new EndpointsController({
      testRun,
    } as unknown as PrismaService);

    await expect(controller.remove('endpoint-1')).rejects.toBeInstanceOf(
      ConflictException
    );
  });
});
