import { ExpenseService } from '../../src/services/expenseService';
import { SplitType } from '../../src/types/expense';
import { prisma } from '../setup';
import { 
  createTestUser, 
  createTestGroup, 
  createTestGroupMember, 
  createTestCategory, 
  createTestTag,
  setupTestDatabase
} from '../helpers/testHelpers';

describe('ExpenseService', () => {
  let expenseService: ExpenseService;
  let testUser: any;
  let testGroup: any;
  let testCategory: any;

  beforeEach(async () => {
    // Clean up any potential leftover state from previous test runs
    await setupTestDatabase(prisma);
    
    // Initialize expense service
    expenseService = new ExpenseService(prisma);
    
    // Create test data
    testUser = await createTestUser(prisma);
    testGroup = await createTestGroup(prisma, testUser.id);
    await createTestGroupMember(prisma, testGroup.id, testUser.id);
    testCategory = await createTestCategory(prisma);
  });

  describe('createExpense', () => {
    it('should create an expense successfully', async () => {
      const createExpenseData = {
        title: 'Dinner',
        amount: 100,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const result = await expenseService.createExpense(testUser.id, createExpenseData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Dinner');
      expect(result.amount).toBe(100);
      expect(result.currency).toBe(testGroup.defaultCurrency);
      expect(result.group.id).toBe(testGroup.id);
      expect(result.createdBy.id).toBe(testUser.id);
    });

    it('should create an expense with multiple splits', async () => {
      const secondUser = await createTestUser(prisma);
      await createTestGroupMember(prisma, testGroup.id, secondUser.id);

      const createExpenseData = {
        title: 'Lunch',
        amount: 50,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id },
          { userId: secondUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 50 }
        ]
      };

      const result = await expenseService.createExpense(testUser.id, createExpenseData);

      expect(result).toBeDefined();
      expect(result.splits).toHaveLength(2);
      expect(result.splits[0].amount).toBe(25);
      expect(result.splits[1].amount).toBe(25);
    });

    it('should throw error if user is not a group member', async () => {
      const createExpenseData = {
        title: 'Dinner',
        amount: 100,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      await expect(expenseService.createExpense('non-member-user', createExpenseData))
        .rejects.toThrow('User is not a member of this group');
    });

    it('should create expense with category and tags', async () => {
      const testTag = await createTestTag(prisma, 'food');

      const createExpenseData = {
        title: 'Groceries',
        amount: 75,
        groupId: testGroup.id,
        categoryId: testCategory.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 75 }
        ],
        tagNames: ['food', 'groceries']
      };

      const result = await expenseService.createExpense(testUser.id, createExpenseData);

      expect(result).toBeDefined();
      expect(result.category?.id).toBe(testCategory.id);
      expect(result.tags).toHaveLength(2);
    });
  });

  describe('getExpenseById', () => {
    it('should get expense by ID', async () => {
      const createExpenseData = {
        title: 'Dinner',
        amount: 100,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const createdExpense = await expenseService.createExpense(testUser.id, createExpenseData);
      const result = await expenseService.getExpenseById(createdExpense.id, testUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdExpense.id);
      expect(result.title).toBe('Dinner');
    });

    it('should throw error if expense not found', async () => {
      await expect(expenseService.getExpenseById('non-existent-id', testUser.id))
        .rejects.toThrow('Expense not found');
    });
  });

  describe('updateExpense', () => {
    it('should update expense successfully', async () => {
      const createExpenseData = {
        title: 'Dinner',
        amount: 100,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const createdExpense = await expenseService.createExpense(testUser.id, createExpenseData);
      
      const updateData = {
        title: 'Updated Dinner',
        amount: 150
      };

      const result = await expenseService.updateExpense(createdExpense.id, testUser.id, updateData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Dinner');
      expect(result.amount).toBe(150);
    });
  });

  describe('deleteExpense', () => {
    it('should archive expense successfully', async () => {
      const createExpenseData = {
        title: 'Dinner',
        amount: 100,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const createdExpense = await expenseService.createExpense(testUser.id, createExpenseData);
      
      await expenseService.deleteExpense(createdExpense.id, testUser.id);

      // Verify expense is archived
      const archivedExpense = await prisma.expense.findUnique({
        where: { id: createdExpense.id }
      });

      expect(archivedExpense?.isArchived).toBe(true);
    });
  });

  describe('searchExpenses', () => {
    it('should search expenses by query', async () => {
      const createExpenseData1 = {
        title: 'Dinner at Restaurant',
        amount: 100,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const createExpenseData2 = {
        title: 'Lunch at Cafe',
        amount: 50,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 50 }
        ]
      };

      await expenseService.createExpense(testUser.id, createExpenseData1);
      await expenseService.createExpense(testUser.id, createExpenseData2);

      const result = await expenseService.searchExpenses(testUser.id, {
        query: 'Restaurant',
        groupId: testGroup.id
      });

      expect(result.expenses).toHaveLength(1);
      expect(result.expenses[0].title).toBe('Dinner at Restaurant');
    });
  });

  describe('getCategories', () => {
    it('should get all categories', async () => {
      const result = await expenseService.getCategories();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTags', () => {
    it('should get all tags', async () => {
      await createTestTag(prisma, 'food');
      await createTestTag(prisma, 'transport');

      const result = await expenseService.getTags();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getExpenseSummary', () => {
    it('should get expense summary', async () => {
      // Create some expenses
      const createExpenseData1 = {
        title: 'Dinner',
        amount: 100,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 100 }
        ]
      };

      const createExpenseData2 = {
        title: 'Lunch',
        amount: 50,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 50 }
        ]
      };

      await expenseService.createExpense(testUser.id, createExpenseData1);
      await expenseService.createExpense(testUser.id, createExpenseData2);

      const result = await expenseService.getExpenseSummary(testUser.id, testGroup.id);

      expect(result).toBeDefined();
      expect(result.totalExpenses).toBe(2);
      expect(result.totalAmount).toBe(150);
      expect(result.currency).toBe(testGroup.defaultCurrency);
    });
  });
}); 