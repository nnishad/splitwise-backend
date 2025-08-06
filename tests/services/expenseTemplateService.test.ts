import { ExpenseTemplateService } from '../../src/services/expenseTemplateService';
import { SplitType } from '../../src/types/expense';
import { prisma } from '../setup';
import { 
  createTestUser, 
  createTestGroup, 
  createTestGroupMember, 
  createTestCategory,
  setupTestDatabase
} from '../helpers/testHelpers';

describe('ExpenseTemplateService', () => {
  let expenseTemplateService: ExpenseTemplateService;
  let testUser: any;
  let testGroup: any;
  let testCategory: any;

  beforeEach(async () => {
    // Clean up any potential leftover state from previous test runs
    await setupTestDatabase(prisma);
    
    // Initialize expense template service
    expenseTemplateService = new ExpenseTemplateService(prisma);
    
    // Create test data
    testUser = await createTestUser(prisma);
    testGroup = await createTestGroup(prisma, testUser.id);
    await createTestGroupMember(prisma, testGroup.id, testUser.id);
    testCategory = await createTestCategory(prisma);
  });

  describe('createTemplate', () => {
    it('should create a template successfully', async () => {
      const createTemplateData = {
        name: 'Monthly Rent',
        amount: 1200,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1200 }
        ]
      };

      const result = await expenseTemplateService.createTemplate(testUser.id, createTemplateData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Monthly Rent');
      expect(result.amount).toBe(1200);
      expect(result.group.id).toBe(testGroup.id);
    });

    it('should throw error if user is not a group member', async () => {
      const createTemplateData = {
        name: 'Monthly Rent',
        amount: 1200,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1200 }
        ]
      };

      await expect(expenseTemplateService.createTemplate('non-member-user', createTemplateData))
        .rejects.toThrow('User is not a member of this group');
    });
  });

  describe('getTemplateById', () => {
    it('should get template by ID', async () => {
      const createTemplateData = {
        name: 'Monthly Rent',
        amount: 1200,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1200 }
        ]
      };

      const createdTemplate = await expenseTemplateService.createTemplate(testUser.id, createTemplateData);
      const result = await expenseTemplateService.getTemplateById(createdTemplate.id, testUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdTemplate.id);
      expect(result.name).toBe('Monthly Rent');
    });

    it('should throw error if template not found', async () => {
      await expect(expenseTemplateService.getTemplateById('non-existent-id', testUser.id))
        .rejects.toThrow('Template not found');
    });
  });

  describe('getTemplatesByGroup', () => {
    it('should get all templates for a group', async () => {
      const createTemplateData = {
        name: 'Monthly Rent',
        amount: 1200,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1200 }
        ]
      };

      await expenseTemplateService.createTemplate(testUser.id, createTemplateData);

      const result = await expenseTemplateService.getTemplatesByGroup(testGroup.id, testUser.id);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Monthly Rent');
    });

    it('should throw error if user is not a group member', async () => {
      await expect(expenseTemplateService.getTemplatesByGroup(testGroup.id, 'non-member-user'))
        .rejects.toThrow('User is not a member of this group');
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const createTemplateData = {
        name: 'Monthly Rent',
        amount: 1200,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1200 }
        ]
      };

      const createdTemplate = await expenseTemplateService.createTemplate(testUser.id, createTemplateData);

      const updateData = {
        name: 'Updated Monthly Rent',
        amount: 1300
      };

      const result = await expenseTemplateService.updateTemplate(createdTemplate.id, testUser.id, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Monthly Rent');
      expect(result.amount).toBe(1300);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      // Create a template first
      const createTemplateData = {
        name: 'Monthly Rent',
        amount: 1200,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1200 }
        ]
      };

      const createdTemplate = await expenseTemplateService.createTemplate(testUser.id, createTemplateData);

      await expenseTemplateService.deleteTemplate(createdTemplate.id, testUser.id);

      // Verify template is deleted
      const deletedTemplate = await prisma.expenseTemplate.findUnique({
        where: { id: createdTemplate.id }
      });

      expect(deletedTemplate).toBeNull();
    });
  });

  describe('createExpenseFromTemplate', () => {
    it('should create expense from template', async () => {
      // Create a template first
      const createTemplateData = {
        name: 'Monthly Rent',
        amount: 1200,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1200 }
        ]
      };

      const createdTemplate = await expenseTemplateService.createTemplate(testUser.id, createTemplateData);

      const result = await expenseTemplateService.createExpenseFromTemplate(createdTemplate.id, testUser.id);

      expect(result).toBeDefined();
      expect(result.title).toBe('Monthly Rent');
      expect(result.amount).toBe(1200);
      expect(result.group.id).toBe(testGroup.id);
    });

    it('should create expense from template with overrides', async () => {
      // Create a template first
      const createTemplateData = {
        name: 'Monthly Rent',
        amount: 1200,
        groupId: testGroup.id,
        splitType: SplitType.EQUAL,
        splits: [
          { userId: testUser.id }
        ],
        payers: [
          { userId: testUser.id, amount: 1200 }
        ]
      };

      const createdTemplate = await expenseTemplateService.createTemplate(testUser.id, createTemplateData);

      const overrideData = {
        name: 'January Rent',
        amount: 1300
      };

      const result = await expenseTemplateService.createExpenseFromTemplate(createdTemplate.id, testUser.id, overrideData);

      expect(result).toBeDefined();
      expect(result.title).toBe('January Rent');
      expect(result.amount).toBe(1300);
    });
  });
}); 