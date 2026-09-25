import type { Prisma } from '@spark/database';
import { describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '../../common/errors/ErrorCodes.js';

import type { AuditLogRow } from './audit.mapper.js';
import { toAuditLogDTO } from './audit.mapper.js';
import { auditRepository } from './audit.repository.js';
import { getAuditLogById, listAuditLogs, recordAudit, recordAuditTx } from './audit.service.js';
import { AuditEntityType } from './audit.types.js';

describe('Audit Module', () => {
  describe('toAuditLogDTO', () => {
    it('defensively sanitizes sensitive credential fields from oldValue and newValue', () => {
      const mockRow: AuditLogRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        actorUserId: 'user-1',
        action: 'UPDATE',
        entityType: 'User',
        entityId: 'user-2',
        oldValue: {
          email: 'test@example.com',
          password: 'plain_password',
          nested: {
            token: 'secret_token',
            safeField: 'visible',
          },
          items: [{ apiKey: 'secret-key', name: 'item1' }],
        },
        newValue: {
          email: 'test_updated@example.com',
          passwordHash: 'argon2id_hash',
          refreshToken: 'refresh_value',
        },
        requestId: 'req-123',
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        actor: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          avatarUrl: null,
        },
      };

      const dto = toAuditLogDTO(mockRow);

      expect(dto.id).toBe(mockRow.id);
      expect(dto.actor?.firstName).toBe('John');
      expect(dto.oldValue).toEqual({
        email: 'test@example.com',
        password: '[REDACTED]',
        nested: {
          token: '[REDACTED]',
          safeField: 'visible',
        },
        items: { items: [{ apiKey: '[REDACTED]', name: 'item1' }] },
      });
      expect(dto.newValue).toEqual({
        email: 'test_updated@example.com',
        passwordHash: '[REDACTED]',
        refreshToken: '[REDACTED]',
      });
    });

    it('handles null values and null actor gracefully', () => {
      const mockRow: AuditLogRow = {
        id: '123e4567-e89b-12d3-a456-426614174099',
        actorUserId: null,
        action: 'DELETE',
        entityType: 'User',
        entityId: 'user-99',
        oldValue: null,
        newValue: null,
        requestId: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        actor: null,
      };

      const dto = toAuditLogDTO(mockRow);
      expect(dto.actor).toBeNull();
      expect(dto.oldValue).toBeNull();
      expect(dto.newValue).toBeNull();
    });
  });

  describe('recordAudit', () => {
    it('creates audit record and attaches requestId if missing', async () => {
      const createSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(undefined);

      await recordAudit({
        actorUserId: 'u1',
        action: 'CREATE',
        entityType: AuditEntityType.USER,
        entityId: 'id-1',
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.USER,
          entityId: 'id-1',
        }),
      );
    });

    it('does not throw when audit creation fails', async () => {
      vi.spyOn(auditRepository, 'create').mockRejectedValue(new Error('DB failure'));

      await expect(
        recordAudit({
          actorUserId: 'u1',
          action: 'CREATE',
          entityType: AuditEntityType.USER,
          entityId: 'id-1',
          requestId: 'existing-req',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('recordAuditTx', () => {
    it('delegates to repository with transaction client', async () => {
      const createSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(undefined);
      const mockTx = {} as Prisma.TransactionClient;

      await recordAuditTx(mockTx, {
        actorUserId: 'u1',
        action: 'UPDATE',
        entityType: AuditEntityType.ROLE,
        entityId: 'r1',
        requestId: 'req-explicit',
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-explicit',
          entityType: AuditEntityType.ROLE,
        }),
        mockTx,
      );
    });
  });

  describe('listAuditLogs', () => {
    it('queries repository and returns mapped audit logs with count', async () => {
      const mockRow: AuditLogRow = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        actorUserId: 'user-1',
        action: 'CREATE',
        entityType: 'Department',
        entityId: 'dept-1',
        oldValue: null,
        newValue: { name: 'Computer Science' },
        requestId: 'req-1',
        ipAddress: '10.0.0.1',
        userAgent: null,
        createdAt: new Date('2026-02-01T12:00:00Z'),
        actor: null,
      };

      vi.spyOn(auditRepository, 'findMany').mockResolvedValue({
        logs: [mockRow],
        total: 1,
      });

      const result = await listAuditLogs(
        { entityType: 'Department' },
        { page: 1, limit: 10, sortOrder: 'desc' },
      );

      expect(result.total).toBe(1);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]?.entityType).toBe('Department');
      expect(result.logs[0]?.newValue).toEqual({ name: 'Computer Science' });
    });
  });

  describe('getAuditLogById', () => {
    it('returns DTO when log exists', async () => {
      const mockRow: AuditLogRow = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        actorUserId: null,
        action: 'CREATE',
        entityType: 'PromotionBatch',
        entityId: 'batch-1',
        oldValue: null,
        newValue: { status: 'PENDING' },
        requestId: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        actor: null,
      };

      vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockRow);

      const log = await getAuditLogById(mockRow.id);
      expect(log.id).toBe(mockRow.id);
      expect(log.entityType).toBe('PromotionBatch');
    });

    it('throws 404 NOT_FOUND ApiError when record does not exist', async () => {
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(null);

      await expect(getAuditLogById('non-existent-id')).rejects.toMatchObject({
        statusCode: 404,
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
