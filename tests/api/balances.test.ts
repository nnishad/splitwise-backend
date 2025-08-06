import { FastifyInstance } from 'fastify';
import { build } from '../../src/server';
import { prisma } from '../setup';
import { 
  createTestUser, 
  createTestGroup, 
  createTestGroupMember,
  setupTestDatabase
} from '../helpers/testHelpers';
import { PrismaClient } from '@prisma/client';

describe('Balance API', () => {
  let app: FastifyInstance;
  let authToken: string;
  let user1: any;
  let user2: any;
  let group: any;

  beforeAll(async () => {
    app = await build();
    
    // Create test users
    user1 = await createTestUser(prisma);
    user2 = await createTestUser(prisma);

    // Create test group
    group = await createTestGroup(prisma, user1.id);
    await createTestGroupMember(prisma, group.id, user1.id);
    await createTestGroupMember(prisma, group.id, user2.id);

    // Create session for authentication
    const session = await prisma.session.create({
      data: {
        userId: user1.id,
        token: 'test-token',
        deviceInfo: 'test',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    });

    authToken = session.token;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up any potential leftover state from previous test runs
    await setupTestDatabase(prisma);
    
    // Recreate test data
    user1 = await createTestUser(prisma);
    user2 = await createTestUser(prisma);
    group = await createTestGroup(prisma, user1.id);
    await createTestGroupMember(prisma, group.id, user1.id);
    await createTestGroupMember(prisma, group.id, user2.id);

    // Recreate session
    const session = await prisma.session.create({
      data: {
        userId: user1.id,
        token: 'test-token',
        deviceInfo: 'test',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    authToken = session.token;
  });

  describe('GET /api/v1/groups/:groupId/balances', () => {
    it('should return group balances', async () => {
      // Create test expense
      const expense = await prisma.expense.create({
        data: {
          title: 'Test Expense',
          amount: 100,
          currency: 'USD',
          groupId: group.id,
          createdById: user1.id
        }
      });

      await prisma.expensePayer.create({
        data: {
          expenseId: expense.id,
          userId: user1.id,
          amount: 100
        }
      });

      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense.id, userId: user1.id, amount: 50 },
          { expenseId: expense.id, userId: user2.id, amount: 50 }
        ]
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${group.id}/balances`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.groupId).toBe(group.id);
      expect(data.data.balances).toHaveLength(2);
    });

    it('should return 400 if user is not a member of the group', async () => {
      const nonMemberUser = await prisma.user.create({
        data: {
          email: 'nonmember@test.com',
          name: 'Non Member',
          
        }
      });

      const nonMemberSession = await prisma.session.create({
        data: {
          userId: nonMemberUser.id,
          token: 'non-member-token',
          deviceInfo: 'test',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${group.id}/balances`,
        headers: {
          authorization: `Bearer ${nonMemberSession.token}`
        }
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/v1/groups/:groupId/balances/:userId', () => {
    it('should return specific user balance', async () => {
      // Create test expense
      const expense = await prisma.expense.create({
        data: {
          title: 'Test Expense',
          amount: 100,
          currency: 'USD',
          groupId: group.id,
          createdById: user1.id
        }
      });

      await prisma.expensePayer.create({
        data: {
          expenseId: expense.id,
          userId: user1.id,
          amount: 100
        }
      });

      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense.id, userId: user1.id, amount: 50 },
          { expenseId: expense.id, userId: user2.id, amount: 50 }
        ]
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${group.id}/balances/${user1.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe(user1.id);
      expect(data.data.totalPaid).toBe(100);
      expect(data.data.totalOwed).toBe(50);
      expect(data.data.netBalance).toBe(50);
    });
  });

  describe('GET /api/v1/groups/:groupId/debts', () => {
    it('should return debt breakdown', async () => {
      // Create test expense
      const expense = await prisma.expense.create({
        data: {
          title: 'Test Expense',
          amount: 100,
          currency: 'USD',
          groupId: group.id,
          createdById: user1.id
        }
      });

      await prisma.expensePayer.create({
        data: {
          expenseId: expense.id,
          userId: user1.id,
          amount: 100
        }
      });

      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense.id, userId: user1.id, amount: 50 },
          { expenseId: expense.id, userId: user2.id, amount: 50 }
        ]
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${group.id}/debts`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.groupId).toBe(group.id);
      expect(data.data.debts).toHaveLength(1);
      
      const debt = data.data.debts[0];
      expect(debt.fromUserId).toBe(user2.id);
      expect(debt.toUserId).toBe(user1.id);
      expect(debt.amount).toBe(50);
    });
  });

  describe('POST /api/v1/groups/:groupId/settlements', () => {
    it('should create a new settlement', async () => {
      const settlementData = {
        fromUserId: user1.id,
        toUserId: user2.id,
        amount: 50,
        currency: 'USD',
        notes: 'Test settlement'
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${group.id}/settlements`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: settlementData
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.groupId).toBe(group.id);
      expect(data.data.fromUserId).toBe(user1.id);
      expect(data.data.toUserId).toBe(user2.id);
      expect(data.data.amount).toBe(50);
      expect(data.data.currency).toBe('USD');
      expect(data.data.notes).toBe('Test settlement');
      expect(data.data.status).toBe('PENDING');
    });

    it('should return 400 for invalid settlement data', async () => {
      const invalidSettlementData = {
        fromUserId: user1.id,
        toUserId: user2.id,
        amount: -50, // Invalid negative amount
        currency: 'USD'
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${group.id}/settlements`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: invalidSettlementData
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/v1/groups/:groupId/settlements', () => {
    it('should return settlements for a group', async () => {
      // Create test settlements
      await prisma.settlement.createMany({
        data: [
          {
            groupId: group.id,
            fromUserId: user1.id,
            toUserId: user2.id,
            amount: 50,
            currency: 'USD',
            status: 'PENDING'
          },
          {
            groupId: group.id,
            fromUserId: user2.id,
            toUserId: user1.id,
            amount: 25,
            currency: 'USD',
            status: 'COMPLETED',
            settledAt: new Date()
          }
        ]
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${group.id}/settlements`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.settlements).toHaveLength(2);
      expect(data.data.pagination.total).toBe(2);
    });
  });

  describe('PUT /api/v1/groups/:groupId/settlements/:settlementId', () => {
    it('should update a settlement', async () => {
      // Create test settlement
      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          status: 'PENDING'
        }
      });

      const updateData = {
        amount: 75,
        notes: 'Updated settlement',
        status: 'COMPLETED'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/groups/${group.id}/settlements/${settlement.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.amount).toBe(75);
      expect(data.data.notes).toBe('Updated settlement');
      expect(data.data.status).toBe('COMPLETED');
    });
  });

  describe('DELETE /api/v1/groups/:groupId/settlements/:settlementId', () => {
    it('should delete a pending settlement', async () => {
      // Create test settlement
      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          status: 'PENDING'
        }
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/groups/${group.id}/settlements/${settlement.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Settlement deleted successfully');
    });
  });

  describe('POST /api/v1/groups/:groupId/settlements/:settlementId/complete', () => {
    it('should complete a settlement', async () => {
      // Create test settlement
      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          status: 'PENDING'
        }
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${group.id}/settlements/${settlement.id}/complete`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('COMPLETED');
      expect(data.data.settledAt).toBeDefined();
    });
  });

  describe('GET /api/v1/groups/:groupId/reminder-settings', () => {
    it('should return reminder settings for a user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${group.id}/reminder-settings`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.groupId).toBe(group.id);
      expect(data.data.userId).toBe(user1.id);
      expect(data.data.frequency).toBe('OFF');
    });
  });

  describe('PUT /api/v1/groups/:groupId/reminder-settings', () => {
    it('should update reminder settings', async () => {
      const updateData = {
        frequency: 'DAILY'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/groups/${group.id}/reminder-settings`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.frequency).toBe('DAILY');
    });
  });
}); 