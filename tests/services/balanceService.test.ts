import { BalanceService } from '../../src/services/balanceService';
import { prisma } from '../setup';
import { 
  createTestUser, 
  createTestGroup, 
  createTestGroupMember,
  setupTestDatabase
} from '../helpers/testHelpers';

describe('BalanceService', () => {
  let balanceService: BalanceService;
  let testUser1: any;
  let testUser2: any;
  let testGroup: any;

  beforeEach(async () => {
    // Clean up any potential leftover state from previous test runs
    await setupTestDatabase(prisma);
    
    // Initialize balance service
    balanceService = new BalanceService(prisma);
    
    // Create test data
    testUser1 = await createTestUser(prisma);
    testUser2 = await createTestUser(prisma);
    testGroup = await createTestGroup(prisma, testUser1.id);
    await createTestGroupMember(prisma, testGroup.id, testUser1.id);
    await createTestGroupMember(prisma, testGroup.id, testUser2.id);
  });

  describe('getGroupBalances', () => {
    it('should return balances for all users in a group', async () => {
      // Create test expense
      const expense = await prisma.expense.create({
        data: {
          title: 'Test Expense',
          amount: 100,
          currency: 'USD',
          groupId: testGroup.id,
          createdById: testUser1.id
        }
      });

      await prisma.expensePayer.create({
        data: {
          expenseId: expense.id,
          userId: testUser1.id,
          amount: 100
        }
      });

      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense.id, userId: testUser1.id, amount: 50 },
          { expenseId: expense.id, userId: testUser2.id, amount: 50 }
        ]
      });

      // Test
      const balances = await balanceService.getGroupBalances(testGroup.id, testUser1.id);

      expect(balances.groupId).toBe(testGroup.id);
      expect(balances.balances).toHaveLength(2);
      
      const user1Balance = balances.balances.find(b => b.userId === testUser1.id);
      const user2Balance = balances.balances.find(b => b.userId === testUser2.id);

      expect(user1Balance?.totalPaid).toBe(100);
      expect(user1Balance?.totalOwed).toBe(50);
      expect(user1Balance?.netBalance).toBe(50);

      expect(user2Balance?.totalPaid).toBe(0);
      expect(user2Balance?.totalOwed).toBe(50);
      expect(user2Balance?.netBalance).toBe(-50);
    });

    it('should throw error if user is not a member of the group', async () => {
      const nonMemberUser = await createTestUser(prisma);

      await expect(
        balanceService.getGroupBalances(testGroup.id, { currency: 'USD' })
      ).rejects.toThrow('User is not a member of this group');
    });
  });

  describe('getUserBalance', () => {
    it('should return specific user balance with debts and settlements', async () => {
      // Create test expense
      const expense = await prisma.expense.create({
        data: {
          title: 'Test Expense',
          amount: 100,
          currency: 'USD',
          groupId: testGroup.id,
          createdById: testUser1.id
        }
      });

      await prisma.expensePayer.create({
        data: {
          expenseId: expense.id,
          userId: testUser1.id,
          amount: 100
        }
      });

      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense.id, userId: testUser1.id, amount: 50 },
          { expenseId: expense.id, userId: testUser2.id, amount: 50 }
        ]
      });

      // Test
      const balance = await balanceService.getUserBalance(testGroup.id, testUser1.id, testUser1.id);

      expect(balance.userId).toBe(testUser1.id);
      expect(balance.totalPaid).toBe(100);
      expect(balance.totalOwed).toBe(50);
      expect(balance.netBalance).toBe(50);
      expect(balance.debts).toBeDefined();
      expect(balance.settlements).toBeDefined();
    });
  });

  describe('getGroupDebts', () => {
    it('should return debt breakdown for the group', async () => {
      // Create test expense
      const expense = await prisma.expense.create({
        data: {
          title: 'Test Expense',
          amount: 100,
          currency: 'USD',
          groupId: testGroup.id,
          createdById: testUser1.id
        }
      });

      await prisma.expensePayer.create({
        data: {
          expenseId: expense.id,
          userId: testUser1.id,
          amount: 100
        }
      });

      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense.id, userId: testUser1.id, amount: 50 },
          { expenseId: expense.id, userId: testUser2.id, amount: 50 }
        ]
      });

      // Test
      const debts = await balanceService.getGroupDebts(testGroup.id, testUser1.id);

      expect(debts.groupId).toBe(testGroup.id);
      expect(debts.debts).toHaveLength(1);
      
      const debt = debts.debts[0];
      expect(debt.fromUserId).toBe(testUser2.id);
      expect(debt.toUserId).toBe(testUser1.id);
      expect(debt.amount).toBe(50);
    });

    it('should return simplified debts when requested', async () => {
      // Create two expenses with cross-debts
      const expense1 = await prisma.expense.create({
        data: {
          title: 'Expense 1',
          amount: 100,
          currency: 'USD',
          groupId: testGroup.id,
          createdById: testUser1.id
        }
      });

      const expense2 = await prisma.expense.create({
        data: {
          title: 'Expense 2',
          amount: 50,
          currency: 'USD',
          groupId: testGroup.id,
          createdById: testUser2.id
        }
      });

      // User 1 pays for expense 1, User 2 owes 50
      await prisma.expensePayer.create({
        data: {
          expenseId: expense1.id,
          userId: testUser1.id,
          amount: 100
        }
      });

      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense1.id, userId: testUser1.id, amount: 50 },
          { expenseId: expense1.id, userId: testUser2.id, amount: 50 }
        ]
      });

      // User 2 pays for expense 2, User 1 owes 25
      await prisma.expensePayer.create({
        data: {
          expenseId: expense2.id,
          userId: testUser2.id,
          amount: 50
        }
      });

      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense2.id, userId: testUser1.id, amount: 25 },
          { expenseId: expense2.id, userId: testUser2.id, amount: 25 }
        ]
      });

      // Test with simplification
      const debts = await balanceService.getGroupDebts(testGroup.id, testUser1.id, { simplify: true });

      expect(debts.simplifiedDebts).toBeDefined();
      expect(debts.simplifiedDebts!.length).toBeLessThanOrEqual(debts.debts.length);
    });
  });
}); 