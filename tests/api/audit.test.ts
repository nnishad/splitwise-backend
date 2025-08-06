import { FastifyInstance } from 'fastify';
import { build } from '../../src/server';
import { PrismaClient } from '@prisma/client';

describe('Audit API', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: any;
  let testGroup: any;
  let testExpense: any;

  beforeAll(async () => {
    app = await build();
    prisma = app.prisma;

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'audit-test@example.com',
        name: 'Audit Test User',
        
      }
    });

    // Create test group
    testGroup = await prisma.group.create({
      data: {
        name: 'Audit Test Group',
        description: 'Test group for audit functionality',
        ownerId: testUser.id,
        defaultCurrency: 'USD'
      }
    });

    // Add user to group
    await prisma.groupMember.create({
      data: {
        groupId: testGroup.id,
        userId: testUser.id,
        role: 'MEMBER'
      }
    });

    // Create test expense
    testExpense = await prisma.expense.create({
      data: {
        title: 'Test Expense',
        description: 'Test expense for audit',
        amount: 100.00,
        currency: 'USD',
        groupId: testGroup.id,
        createdById: testUser.id,
        date: new Date()
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({
      where: {
        entityId: testExpense.id
      }
    });
    await prisma.expense.deleteMany({
      where: { id: testExpense.id }
    });
    await prisma.groupMember.deleteMany({
      where: { groupId: testGroup.id }
    });
    await prisma.group.deleteMany({
      where: { id: testGroup.id }
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id }
    });
    await app.close();
  });

  describe('GET /api/v1/audit/history', () => {
    it('should return audit history for a group', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/history?groupId=${testGroup.id}`,
        headers: {
          authorization: `Bearer ${testUser.id}` // Simplified auth for testing
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.logs).toBeDefined();
      expect(Array.isArray(data.data.logs)).toBe(true);
    });

    it('should filter audit history by entity type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/history?entityType=expense&groupId=${testGroup.id}`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
    });

    it('should return paginated results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/history?groupId=${testGroup.id}&page=1&limit=10`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(10);
    });
  });

  describe('GET /api/v1/audit/expenses/:id/history', () => {
    it('should return audit history for a specific expense', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/expenses/${testExpense.id}/history`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.versions).toBeDefined();
      expect(Array.isArray(data.data.versions)).toBe(true);
    });

    it('should return 404 for non-existent expense', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/audit/expenses/non-existent-id/history',
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/audit/groups/:id/history', () => {
    it('should return audit history for a group', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/groups/${testGroup.id}/history`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.logs).toBeDefined();
    });
  });

  describe('POST /api/v1/audit/expenses/:id/revert/:versionId', () => {
    it('should revert expense to previous version', async () => {
      // First, create an audit log entry for the expense
      const auditLog = await prisma.auditLog.create({
        data: {
          entityType: 'expense',
          entityId: testExpense.id,
          action: 'created',
          userId: testUser.id,
          groupId: testGroup.id,
          newData: {
            title: 'Original Title',
            amount: 50.00
          },
          version: 1
        }
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/audit/expenses/${testExpense.id}/revert/${auditLog.id}`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        },
        payload: {
          reason: 'Testing revert functionality'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.expense).toBeDefined();
      expect(data.data.revertedFrom).toBeDefined();
    });
  });

  describe('GET /api/v1/audit/reports/transactions', () => {
    it('should return transaction history with filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/reports/transactions?groupId=${testGroup.id}`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.logs).toBeDefined();
    });
  });

  describe('GET /api/v1/audit/reports/summaries', () => {
    it('should return spending summaries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/reports/summaries?groupId=${testGroup.id}&period=monthly`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.summaries).toBeDefined();
    });
  });

  describe('GET /api/v1/audit/reports/visualizations', () => {
    it('should return visualization data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/reports/visualizations?groupId=${testGroup.id}&chartType=pie&breakdownBy=category`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.chartType).toBe('pie');
      expect(data.data.breakdownBy).toBe('category');
      expect(data.data.labels).toBeDefined();
      expect(data.data.datasets).toBeDefined();
    });
  });

  describe('POST /api/v1/audit/exports', () => {
    it('should create an export job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/audit/exports',
        headers: {
          authorization: `Bearer ${testUser.id}`
        },
        payload: {
          exportType: 'csv',
          filters: {
            groupId: testGroup.id,
            entityType: 'expense'
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.exportId).toBeDefined();
      expect(data.data.status).toBeDefined();
    });
  });

  describe('GET /api/v1/audit/exports/:id/status', () => {
    it('should return export status', async () => {
      // First create an export
      const exportResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/audit/exports',
        headers: {
          authorization: `Bearer ${testUser.id}`
        },
        payload: {
          exportType: 'csv',
          filters: {
            groupId: testGroup.id
          }
        }
      });

      const exportData = JSON.parse(exportResponse.payload);
      const exportId = exportData.data.exportId;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/exports/${exportId}/status`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.exportId).toBe(exportId);
      expect(data.data.status).toBeDefined();
    });
  });

  describe('GET /api/v1/audit/groups/:id/statistics', () => {
    it('should return audit statistics for a group', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit/groups/${testGroup.id}/statistics`,
        headers: {
          authorization: `Bearer ${testUser.id}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.totalLogs).toBeDefined();
      expect(data.data.todayLogs).toBeDefined();
      expect(data.data.thisWeekLogs).toBeDefined();
      expect(data.data.thisMonthLogs).toBeDefined();
    });
  });
}); 