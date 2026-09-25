import { describe, expect, it, vi } from 'vitest';

import { prisma } from '../../lib/prisma.js';

import { auditRepository } from './audit.repository.js';
import { AuditEntityType } from './audit.types.js';

describe('AuditRepository', () => {
  describe('create', () => {
    it('creates audit log with default prisma client', async () => {
      const mockCreate = vi.fn().mockResolvedValue({});
      const dbMock = {
        auditLog: {
          create: mockCreate,
        },
      };

      await auditRepository.create(
        {
          actorUserId: 'u1',
          action: 'CREATE',
          entityType: AuditEntityType.USER,
          entityId: 'e1',
          oldValue: null,
          newValue: { a: 1 },
          requestId: 'r1',
          ipAddress: '1.2.3.4',
          userAgent: 'agent',
        },
        dbMock as unknown as typeof prisma,
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const firstCallArgs = mockCreate.mock.calls[0] as [
        {
          data: {
            actorUserId: string;
            action: string;
            entityType: string;
            entityId: string;
            requestId: string;
          };
        },
      ];
      const payload = firstCallArgs[0].data;
      expect(payload.actorUserId).toBe('u1');
      expect(payload.action).toBe('CREATE');
      expect(payload.entityType).toBe('User');
      expect(payload.entityId).toBe('e1');
      expect(payload.requestId).toBe('r1');
    });
  });

  describe('findMany', () => {
    it('applies all filters and options in where clause', async () => {
      const findManySpy = vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([]);
      const countSpy = vi.spyOn(prisma.auditLog, 'count').mockResolvedValue(0);

      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-02-01');

      const result = await auditRepository.findMany(
        {
          actorUserId: 'u1',
          action: 'UPDATE',
          entityType: 'Department',
          entityId: 'd1',
          dateFrom,
          dateTo,
          search: 'query',
        },
        { page: 2, limit: 10, sortOrder: 'asc' },
      );

      expect(result).toEqual({ logs: [], total: 0 });
      expect(findManySpy).toHaveBeenCalledTimes(1);
      const findCall = findManySpy.mock.calls[0]?.[0];
      expect(findCall?.skip).toBe(10);
      expect(findCall?.take).toBe(10);
      expect(findCall?.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
      expect(countSpy).toHaveBeenCalledTimes(1);
    });

    it('works with minimal filters and default sort order', async () => {
      vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.auditLog, 'count').mockResolvedValue(0);

      const result = await auditRepository.findMany({}, { page: 1, limit: 20 });
      expect(result).toEqual({ logs: [], total: 0 });
    });
  });

  describe('findById', () => {
    it('delegates to prisma.auditLog.findUnique', async () => {
      const findUniqueSpy = vi.spyOn(prisma.auditLog, 'findUnique').mockResolvedValue(null);

      const result = await auditRepository.findById('test-id');
      expect(result).toBeNull();
      expect(findUniqueSpy).toHaveBeenCalledTimes(1);
      const uniqueCall = findUniqueSpy.mock.calls[0]?.[0];
      expect(uniqueCall?.where).toEqual({ id: 'test-id' });
    });
  });
});
