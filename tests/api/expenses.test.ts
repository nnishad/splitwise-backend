import { build } from '../../src/server';
import { PrismaClient } from '@prisma/client';
import { createTestUser, createTestGroup, createTestGroupMember } from '../helpers/testHelpers';

describe('Expense API', () => {
  let app: any;
  let prisma: PrismaClient;
  let testUser: any;
  let testGroup: any;
  let authToken: string;

  beforeAll(async () => {
    app = await build();
    prisma = app.prisma;
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.expenseHistory.deleteMany();
    await prisma.expenseComment.deleteMany();
    await prisma.expenseTag.deleteMany();
    await prisma.expenseSplit.deleteMany();
    await prisma.expensePayer.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.category.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and group
    testUser = await createTestUser(prisma);
    testGroup = await createTestGroup(prisma, testUser.id);
    await createTestGroupMember(prisma, testGroup.id, testUser.id);

    // Login to get auth token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: 'password123'
      }
    });

    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/expenses', () => {
    it('should create a new expense with equal splits', async () => {
      const expenseData = {
        title: 'Dinner',
        description: 'Group dinner at restaurant',
        amount: 100,
        currency: 'USD',
        date: new Date().toISOString(),
        location: 'Restaurant XYZ',
        groupId: testGroup.id,
        splitType: 'EQUAL',
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ],
        tagNames: ['dinner', 'food'],
        comment: 'Great dinner!'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Dinner');
      expect(data.data.amount).toBe(100);
      expect(data.data.splits).toHaveLength(1);
      expect(data.data.payers).toHaveLength(1);
      expect(data.data.tags).toHaveLength(2);
      expect(data.data.comments).toHaveLength(1);
    });

    it('should create expense with percentage splits', async () => {
      const expenseData = {
        title: 'Rent',
        amount: 1000,
        groupId: testGroup.id,
        splitType: 'PERCENTAGE',
        splits: [
          { userId: testUser.id, percentage: 60 }
        ],
        payers: [
          { userId: testUser.id, amount: 1000 }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.splits[0].amount).toBe(600);
      expect(data.data.splits[0].percentage).toBe(60);
    });

    it('should create expense with amount splits', async () => {
      const expenseData = {
        title: 'Groceries',
        amount: 150,
        groupId: testGroup.id,
        splitType: 'AMOUNT',
        splits: [
          { userId: testUser.id, amount: 100 }
        ],
        payers: [
          { userId: testUser.id, amount: 150 }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.splits[0].amount).toBe(100);
    });

    it('should create recurring expense', async () => {
      const expenseData = {
        title: 'Monthly Rent',
        amount: 1000,
        groupId: testGroup.id,
        isRecurring: true,
        recurringPattern: 'MONTHLY',
        nextRecurringDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        splitType: 'EQUAL',
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1000 }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.isRecurring).toBe(true);
      expect(data.data.recurringPattern).toBe('MONTHLY');
    });

    it('should reject expense if user is not group member', async () => {
      const expenseData = {
        title: 'Dinner',
        amount: 100,
        groupId: 'non-existent-group',
        splitType: 'EQUAL',
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.message).toContain('User is not a member of this group');
    });

    it('should reject invalid split amounts', async () => {
      const expenseData = {
        title: 'Dinner',
        amount: 100,
        groupId: testGroup.id,
        splitType: 'EQUAL',
        splits: [
          { userId: testUser.id, amount: 60 },
          { userId: testUser.id, amount: 50 }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Equal splits must have equal amounts');
    });
  });

  describe('GET /api/v1/expenses/:id', () => {
    let testExpense: any;

    beforeEach(async () => {
      // Create a test expense
      const expenseData = {
        title: 'Test Expense',
        amount: 100,
        groupId: testGroup.id,
        splitType: 'EQUAL',
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      const data = JSON.parse(response.body);
      testExpense = data.data;
    });

    it('should get expense by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expenses/${testExpense.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(testExpense.id);
      expect(data.data.title).toBe('Test Expense');
    });

    it('should return 404 for non-existent expense', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/v1/expenses/:id', () => {
    let testExpense: any;

    beforeEach(async () => {
      // Create a test expense
      const expenseData = {
        title: 'Original Title',
        amount: 100,
        groupId: testGroup.id,
        splitType: 'EQUAL',
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      const data = JSON.parse(response.body);
      testExpense = data.data;
    });

    it('should update expense', async () => {
      const updateData = {
        title: 'Updated Title',
        amount: 150,
        description: 'Updated description'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/expenses/${testExpense.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Title');
      expect(data.data.amount).toBe(150);
      expect(data.data.description).toBe('Updated description');
    });

    it('should update expense splits', async () => {
      const updateData = {
        amount: 200,
        splitType: 'PERCENTAGE',
        splits: [
          { userId: testUser.id, percentage: 75 }
        ],
        payers: [
          { userId: testUser.id, amount: 200 }
        ]
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/expenses/${testExpense.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.amount).toBe(200);
      expect(data.data.splits[0].amount).toBe(150);
      expect(data.data.splits[0].percentage).toBe(75);
    });
  });

  describe('DELETE /api/v1/expenses/:id', () => {
    let testExpense: any;

    beforeEach(async () => {
      // Create a test expense
      const expenseData = {
        title: 'Test Expense',
        amount: 100,
        groupId: testGroup.id,
        splitType: 'EQUAL',
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      const data = JSON.parse(response.body);
      testExpense = data.data;
    });

    it('should archive expense', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/expenses/${testExpense.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Expense archived successfully');
    });

    it('should restore archived expense', async () => {
      // First archive the expense
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/expenses/${testExpense.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // Then restore it
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/expenses/${testExpense.id}/restore`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.isArchived).toBe(false);
    });
  });

  describe('GET /api/v1/expenses', () => {
    beforeEach(async () => {
      // Create multiple test expenses
      const expenses = [
        {
          title: 'Dinner',
          amount: 100,
          groupId: testGroup.id,
          splitType: 'EQUAL',
          splits: [{ userId: testUser.id }],
          payers: [{ userId: testUser.id, amount: 100 }],
          tagNames: ['food', 'dinner']
        },
        {
          title: 'Rent',
          amount: 1000,
          groupId: testGroup.id,
          splitType: 'EQUAL',
          splits: [{ userId: testUser.id }],
          payers: [{ userId: testUser.id, amount: 1000 }],
          tagNames: ['rent']
        }
      ];

      for (const expense of expenses) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/expenses',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: expense
        });
      }
    });

    it('should list expenses with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses?page=1&limit=10',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.expenses).toHaveLength(2);
      expect(data.data.pagination.total).toBe(2);
    });

    it('should filter expenses by group', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expenses?groupId=${testGroup.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.expenses).toHaveLength(2);
    });

    it('should search expenses by text', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses?query=dinner',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.expenses).toHaveLength(1);
      expect(data.data.expenses[0].title).toBe('Dinner');
    });

    it('should filter by amount range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses?amountFrom=500&amountTo=1500',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.expenses).toHaveLength(1);
      expect(data.data.expenses[0].title).toBe('Rent');
    });
  });

  describe('PATCH /api/v1/expenses/bulk', () => {
    let expenseIds: string[];

    beforeEach(async () => {
      // Create test expenses
      const expenses = [
        {
          title: 'Expense 1',
          amount: 100,
          groupId: testGroup.id,
          splitType: 'EQUAL',
          splits: [{ userId: testUser.id }],
          payers: [{ userId: testUser.id, amount: 100 }]
        },
        {
          title: 'Expense 2',
          amount: 200,
          groupId: testGroup.id,
          splitType: 'EQUAL',
          splits: [{ userId: testUser.id }],
          payers: [{ userId: testUser.id, amount: 200 }]
        }
      ];

      expenseIds = [];
      for (const expense of expenses) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/expenses',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: expense
        });

        const data = JSON.parse(response.body);
        expenseIds.push(data.data.id);
      }
    });

    it('should bulk update expenses', async () => {
      const updateData = {
        expenseIds,
        updates: {
          title: 'Updated Title'
        }
      };

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/expenses/bulk',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Expenses updated successfully');
    });
  });

  describe('DELETE /api/v1/expenses/bulk', () => {
    let expenseIds: string[];

    beforeEach(async () => {
      // Create test expenses
      const expenses = [
        {
          title: 'Expense 1',
          amount: 100,
          groupId: testGroup.id,
          splitType: 'EQUAL',
          splits: [{ userId: testUser.id }],
          payers: [{ userId: testUser.id, amount: 100 }]
        },
        {
          title: 'Expense 2',
          amount: 200,
          groupId: testGroup.id,
          splitType: 'EQUAL',
          splits: [{ userId: testUser.id }],
          payers: [{ userId: testUser.id, amount: 200 }]
        }
      ];

      expenseIds = [];
      for (const expense of expenses) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/expenses',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: expense
        });

        const data = JSON.parse(response.body);
        expenseIds.push(data.data.id);
      }
    });

    it('should bulk archive expenses', async () => {
      const deleteData = {
        expenseIds
      };

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/expenses/bulk',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: deleteData
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Expenses archived successfully');
    });
  });

  describe('GET /api/v1/expenses/categories', () => {
    it('should return categories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses/categories',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/v1/expenses/tags', () => {
    it('should return tags', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses/tags',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/v1/expenses/summary', () => {
    beforeEach(async () => {
      // Create test expenses for summary
      const expenses = [
        {
          title: 'Dinner',
          amount: 100,
          groupId: testGroup.id,
          splitType: 'EQUAL',
          splits: [{ userId: testUser.id }],
          payers: [{ userId: testUser.id, amount: 100 }]
        },
        {
          title: 'Rent',
          amount: 1000,
          groupId: testGroup.id,
          splitType: 'EQUAL',
          splits: [{ userId: testUser.id }],
          payers: [{ userId: testUser.id, amount: 1000 }]
        }
      ];

      for (const expense of expenses) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/expenses',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: expense
        });
      }
    });

    it('should return expense summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expenses/summary',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.totalExpenses).toBe(2);
      expect(data.data.totalAmount).toBe(1100);
      expect(data.data.averageAmount).toBe(550);
    });
  });

  describe('POST /api/v1/expenses/:id/comments', () => {
    let testExpense: any;

    beforeEach(async () => {
      // Create a test expense
      const expenseData = {
        title: 'Test Expense',
        amount: 100,
        groupId: testGroup.id,
        splitType: 'EQUAL',
        splits: [{ userId: testUser.id }],
        payers: [{ userId: testUser.id, amount: 100 }]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      const data = JSON.parse(response.body);
      testExpense = data.data;
    });

    it('should add comment to expense', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/expenses/${testExpense.id}/comments`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: commentData
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('This is a test comment');
    });
  });

  describe('GET /api/v1/expenses/:id/comments', () => {
    let testExpense: any;

    beforeEach(async () => {
      // Create a test expense with comments
      const expenseData = {
        title: 'Test Expense',
        amount: 100,
        groupId: testGroup.id,
        splitType: 'EQUAL',
        splits: [{ userId: testUser.id }],
        payers: [{ userId: testUser.id, amount: 100 }],
        comment: 'Initial comment'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      const data = JSON.parse(response.body);
      testExpense = data.data;

      // Add another comment
      await app.inject({
        method: 'POST',
        url: `/api/v1/expenses/${testExpense.id}/comments`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: { content: 'Second comment' }
      });
    });

    it('should get expense comments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expenses/${testExpense.id}/comments`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/expenses/:id/history', () => {
    let testExpense: any;

    beforeEach(async () => {
      // Create a test expense
      const expenseData = {
        title: 'Test Expense',
        amount: 100,
        groupId: testGroup.id,
        splitType: 'EQUAL',
        splits: [{ userId: testUser.id }],
        payers: [{ userId: testUser.id, amount: 100 }]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expenses',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: expenseData
      });

      const data = JSON.parse(response.body);
      testExpense = data.data;
    });

    it('should get expense history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expenses/${testExpense.id}/history`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });
}); 