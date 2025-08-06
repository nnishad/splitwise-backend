import { SettlementService } from '../../src/services/settlementService';
import { SettlementStatus } from '../../src/types/balance';
import { prisma } from '../setup';
import { 
  createTestUser, 
  createTestGroup, 
  createTestGroupMember,
  setupTestDatabase
} from '../helpers/testHelpers';

describe('SettlementService', () => {
  let settlementService: SettlementService;
  let testUser1: any;
  let testUser2: any;
  let testGroup: any;

  beforeEach(async () => {
    // Clean up any potential leftover state from previous test runs
    await setupTestDatabase(prisma);
    
    // Initialize settlement service
    settlementService = new SettlementService(prisma);
    
    // Create test data
    testUser1 = await createTestUser(prisma);
    testUser2 = await createTestUser(prisma);
    testGroup = await createTestGroup(prisma, testUser1.id);
    await createTestGroupMember(prisma, testGroup.id, testUser1.id);
    await createTestGroupMember(prisma, testGroup.id, testUser2.id);
  });

  describe('createSettlement', () => {
    it('should create a new settlement', async () => {
      // Test
      const settlement = await settlementService.createSettlement(testGroup.id, testUser1.id, {
        fromUserId: testUser1.id,
        toUserId: testUser2.id,
        amount: 50,
        currency: 'USD',
        notes: 'Test settlement'
      });

      expect(settlement.groupId).toBe(testGroup.id);
      expect(settlement.fromUserId).toBe(testUser1.id);
      expect(settlement.toUserId).toBe(testUser2.id);
      expect(settlement.amount).toBe(50);
      expect(settlement.currency).toBe('USD');
      expect(settlement.notes).toBe('Test settlement');
      expect(settlement.status).toBe(SettlementStatus.PENDING);
    });

    it('should throw error if user is not a member of the group', async () => {
      const nonMemberUser = await createTestUser(prisma);

      await expect(
        settlementService.createSettlement(testGroup.id, nonMemberUser.id, {
          fromUserId: testUser1.id,
          toUserId: testUser2.id,
          amount: 50,
          currency: 'USD'
        })
      ).rejects.toThrow('User is not a member of this group');
    });

    it('should throw error if trying to create settlement between same user', async () => {
      await expect(
        settlementService.createSettlement(testGroup.id, testUser1.id, {
          fromUserId: testUser1.id,
          toUserId: testUser1.id,
          amount: 50,
          currency: 'USD'
        })
      ).rejects.toThrow('Cannot create settlement between the same user');
    });
  });

  describe('getSettlementById', () => {
    it('should return settlement by ID', async () => {
      // Create test data
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@test.com',
          name: 'User 1',
          password: 'hashedpassword'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          name: 'User 2',
          password: 'hashedpassword'
        }
      });

      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          description: 'Test group',
          ownerId: user1.id,
          defaultCurrency: 'USD'
        }
      });

      await prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: user1.id },
          { groupId: group.id, userId: user2.id }
        ]
      });

      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          notes: 'Test settlement',
          status: SettlementStatus.PENDING
        }
      });

      // Test
      const retrievedSettlement = await settlementService.getSettlementById(settlement.id, user1.id);

      expect(retrievedSettlement.id).toBe(settlement.id);
      expect(retrievedSettlement.groupId).toBe(group.id);
      expect(retrievedSettlement.fromUserId).toBe(user1.id);
      expect(retrievedSettlement.toUserId).toBe(user2.id);
      expect(retrievedSettlement.amount).toBe(50);
    });

    it('should throw error if settlement not found', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@test.com',
          name: 'User',
          password: 'hashedpassword'
        }
      });

      await expect(
        settlementService.getSettlementById('non-existent-id', user.id)
      ).rejects.toThrow('Settlement not found');
    });
  });

  describe('updateSettlement', () => {
    it('should update settlement', async () => {
      // Create test data
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@test.com',
          name: 'User 1',
          password: 'hashedpassword'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          name: 'User 2',
          password: 'hashedpassword'
        }
      });

      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          description: 'Test group',
          ownerId: user1.id,
          defaultCurrency: 'USD'
        }
      });

      await prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: user1.id },
          { groupId: group.id, userId: user2.id }
        ]
      });

      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          notes: 'Original notes',
          status: SettlementStatus.PENDING
        }
      });

      // Test
      const updatedSettlement = await settlementService.updateSettlement(settlement.id, user1.id, {
        amount: 75,
        notes: 'Updated notes',
        status: SettlementStatus.COMPLETED
      });

      expect(updatedSettlement.amount).toBe(75);
      expect(updatedSettlement.notes).toBe('Updated notes');
      expect(updatedSettlement.status).toBe(SettlementStatus.COMPLETED);
      expect(updatedSettlement.settledAt).toBeDefined();
    });

    it('should not allow updating completed settlements', async () => {
      // Create test data
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@test.com',
          name: 'User 1',
          password: 'hashedpassword'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          name: 'User 2',
          password: 'hashedpassword'
        }
      });

      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          description: 'Test group',
          ownerId: user1.id,
          defaultCurrency: 'USD'
        }
      });

      await prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: user1.id },
          { groupId: group.id, userId: user2.id }
        ]
      });

      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          status: SettlementStatus.COMPLETED,
          settledAt: new Date()
        }
      });

      await expect(
        settlementService.updateSettlement(settlement.id, user1.id, {
          amount: 75
        })
      ).rejects.toThrow('Cannot update completed or cancelled settlements');
    });
  });

  describe('deleteSettlement', () => {
    it('should delete pending settlement', async () => {
      // Create test data
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@test.com',
          name: 'User 1',
          password: 'hashedpassword'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          name: 'User 2',
          password: 'hashedpassword'
        }
      });

      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          description: 'Test group',
          ownerId: user1.id,
          defaultCurrency: 'USD'
        }
      });

      await prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: user1.id },
          { groupId: group.id, userId: user2.id }
        ]
      });

      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          status: SettlementStatus.PENDING
        }
      });

      // Test
      await settlementService.deleteSettlement(settlement.id, user1.id);

      const deletedSettlement = await prisma.settlement.findUnique({
        where: { id: settlement.id }
      });

      expect(deletedSettlement).toBeNull();
    });

    it('should not allow deleting completed settlements', async () => {
      // Create test data
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@test.com',
          name: 'User 1',
          password: 'hashedpassword'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          name: 'User 2',
          password: 'hashedpassword'
        }
      });

      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          description: 'Test group',
          ownerId: user1.id,
          defaultCurrency: 'USD'
        }
      });

      await prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: user1.id },
          { groupId: group.id, userId: user2.id }
        ]
      });

      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          status: SettlementStatus.COMPLETED,
          settledAt: new Date()
        }
      });

      await expect(
        settlementService.deleteSettlement(settlement.id, user1.id)
      ).rejects.toThrow('Cannot delete completed or cancelled settlements');
    });
  });

  describe('getGroupSettlements', () => {
    it('should return settlements for a group with pagination', async () => {
      // Create test data
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@test.com',
          name: 'User 1',
          password: 'hashedpassword'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          name: 'User 2',
          password: 'hashedpassword'
        }
      });

      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          description: 'Test group',
          ownerId: user1.id,
          defaultCurrency: 'USD'
        }
      });

      await prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: user1.id },
          { groupId: group.id, userId: user2.id }
        ]
      });

      // Create multiple settlements
      await prisma.settlement.createMany({
        data: [
          {
            groupId: group.id,
            fromUserId: user1.id,
            toUserId: user2.id,
            amount: 50,
            currency: 'USD',
            status: SettlementStatus.PENDING
          },
          {
            groupId: group.id,
            fromUserId: user2.id,
            toUserId: user1.id,
            amount: 25,
            currency: 'USD',
            status: SettlementStatus.COMPLETED,
            settledAt: new Date()
          }
        ]
      });

      // Test
      const settlements = await settlementService.getGroupSettlements(group.id, user1.id, 1, 10);

      expect(settlements.settlements).toHaveLength(2);
      expect(settlements.pagination.total).toBe(2);
      expect(settlements.pagination.page).toBe(1);
      expect(settlements.pagination.limit).toBe(10);
    });
  });

  describe('completeSettlement and cancelSettlement', () => {
    it('should complete a settlement', async () => {
      // Create test data
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@test.com',
          name: 'User 1',
          password: 'hashedpassword'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          name: 'User 2',
          password: 'hashedpassword'
        }
      });

      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          description: 'Test group',
          ownerId: user1.id,
          defaultCurrency: 'USD'
        }
      });

      await prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: user1.id },
          { groupId: group.id, userId: user2.id }
        ]
      });

      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          status: SettlementStatus.PENDING
        }
      });

      // Test
      const completedSettlement = await settlementService.completeSettlement(settlement.id, user1.id);

      expect(completedSettlement.status).toBe(SettlementStatus.COMPLETED);
      expect(completedSettlement.settledAt).toBeDefined();
    });

    it('should cancel a settlement', async () => {
      // Create test data
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@test.com',
          name: 'User 1',
          password: 'hashedpassword'
        }
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          name: 'User 2',
          password: 'hashedpassword'
        }
      });

      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          description: 'Test group',
          ownerId: user1.id,
          defaultCurrency: 'USD'
        }
      });

      await prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: user1.id },
          { groupId: group.id, userId: user2.id }
        ]
      });

      const settlement = await prisma.settlement.create({
        data: {
          groupId: group.id,
          fromUserId: user1.id,
          toUserId: user2.id,
          amount: 50,
          currency: 'USD',
          status: SettlementStatus.PENDING
        }
      });

      // Test
      const cancelledSettlement = await settlementService.cancelSettlement(settlement.id, user1.id);

      expect(cancelledSettlement.status).toBe(SettlementStatus.CANCELLED);
    });
  });
}); 