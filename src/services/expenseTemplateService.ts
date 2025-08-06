import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { 
  CreateExpenseTemplateRequest, 
  UpdateExpenseTemplateRequest, 
  ExpenseTemplateResponse,
  CreateExpenseRequest,
  SplitType,
  RecurringPattern
} from '../types/expense';

export class ExpenseTemplateService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Create a new expense template
  async createTemplate(userId: string, data: CreateExpenseTemplateRequest): Promise<ExpenseTemplateResponse> {
    // Validate that user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: data.groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Get group to use its default currency
    const group = await this.prisma.group.findUnique({
      where: { id: data.groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Validate splits and payers
    this.validateSplitsAndPayers(data.splits, data.payers, data.amount, data.splitType);

    const template = await this.prisma.expenseTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        amount: new Decimal(data.amount),
        groupId: data.groupId,
        categoryId: data.categoryId,
        splitType: data.splitType,
        splits: data.splits,
        payers: data.payers,
        tagNames: data.tagNames || [],
        isRecurring: data.isRecurring || false,
        recurringPattern: data.recurringPattern,
        nextRecurringDate: data.nextRecurringDate ? new Date(data.nextRecurringDate) : null,
        createdById: userId,
      },
      include: {
        group: true,
        createdBy: true,
        category: true,
      }
    });

    return this.formatTemplateResponse(template);
  }

  // Get template by ID
  async getTemplateById(templateId: string, userId: string): Promise<ExpenseTemplateResponse> {
    const template = await this.prisma.expenseTemplate.findFirst({
      where: {
        id: templateId,
        group: {
          members: {
            some: { userId }
          }
        }
      },
      include: {
        group: true,
        createdBy: true,
        category: true,
      }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return this.formatTemplateResponse(template);
  }

  // Get all templates for a group
  async getTemplatesByGroup(groupId: string, userId: string): Promise<ExpenseTemplateResponse[]> {
    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    const templates = await this.prisma.expenseTemplate.findMany({
      where: { groupId },
      include: {
        group: true,
        createdBy: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return templates.map(template => this.formatTemplateResponse(template));
  }

  // Update template
  async updateTemplate(templateId: string, userId: string, data: UpdateExpenseTemplateRequest): Promise<ExpenseTemplateResponse> {
    const template = await this.prisma.expenseTemplate.findFirst({
      where: {
        id: templateId,
        group: {
          members: {
            some: { userId }
          }
        }
      }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Validate splits and payers if provided
    if (data.splits && data.payers && data.splitType) {
      this.validateSplitsAndPayers(data.splits, data.payers, data.amount || Number(template.amount), data.splitType);
    }

    const updatedTemplate = await this.prisma.expenseTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount ? new Decimal(data.amount) : undefined,
        categoryId: data.categoryId,
        splitType: data.splitType,
        splits: data.splits,
        payers: data.payers,
        tagNames: data.tagNames,
        isRecurring: data.isRecurring,
        recurringPattern: data.recurringPattern,
        nextRecurringDate: data.nextRecurringDate ? new Date(data.nextRecurringDate) : undefined,
      },
      include: {
        group: true,
        createdBy: true,
        category: true,
      }
    });

    return this.formatTemplateResponse(updatedTemplate);
  }

  // Delete template
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const template = await this.prisma.expenseTemplate.findFirst({
      where: {
        id: templateId,
        group: {
          members: {
            some: { userId }
          }
        }
      }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    await this.prisma.expenseTemplate.delete({
      where: { id: templateId }
    });
  }

  // Create expense from template
  async createExpenseFromTemplate(templateId: string, userId: string, overrideData?: Partial<CreateExpenseTemplateRequest>): Promise<any> {
    const template = await this.prisma.expenseTemplate.findUnique({
      where: { id: templateId },
      include: {
        group: true,
        category: true,
      }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: template.groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Prepare expense data from template
    const finalAmount = overrideData?.amount || Number(template.amount);
    const finalPayers = overrideData?.payers || template.payers;
    
    // If amount is overridden but payers are not, update payers proportionally
    let adjustedPayers = finalPayers;
    if (overrideData?.amount && !overrideData?.payers) {
      const originalAmount = Number(template.amount);
      const ratio = finalAmount / originalAmount;
      adjustedPayers = (template.payers as any[]).map(payer => ({
        ...payer,
        amount: payer.amount * ratio
      }));
    }

    const expenseData: CreateExpenseRequest = {
      title: overrideData?.name || template.name,
      description: (overrideData?.description || template.description) || undefined,
      amount: finalAmount,
      groupId: template.groupId,
      categoryId: (overrideData?.categoryId || template.categoryId) || undefined,
      splitType: (overrideData?.splitType || template.splitType) as SplitType,
      splits: (overrideData?.splits || template.splits) as any[],
      payers: adjustedPayers as any[],
      tagNames: (overrideData?.tagNames || template.tagNames) as string[],
      isRecurring: overrideData?.isRecurring || template.isRecurring,
      recurringPattern: (overrideData?.recurringPattern || template.recurringPattern) as RecurringPattern | undefined,
      nextRecurringDate: overrideData?.nextRecurringDate || template.nextRecurringDate?.toISOString(),
    };

    // Import and use the expense service to create the expense
    const { ExpenseService } = await import('./expenseService');
    const expenseService = new ExpenseService(this.prisma);
    
    return await expenseService.createExpense(template.groupId, userId, expenseData);
  }

  // Private helper methods
  private validateSplitsAndPayers(splits: any[], payers: any[], totalAmount: number, splitType: SplitType): void {
    // Validate that all users exist and are group members
    // This would be implemented with actual user validation

    // Validate split amounts
    if (splitType === SplitType.EQUAL) {
      // For equal splits, amounts are calculated by the service, not validated here
      // Just ensure we have at least one split
      if (splits.length === 0) {
        throw new Error('Equal splits require at least one participant');
      }
    } else if (splitType === SplitType.PERCENTAGE) {
      const totalPercentage = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Percentage splits must total 100%');
      }
    } else if (splitType === SplitType.AMOUNT) {
      const totalSplitAmount = splits.reduce((sum, split) => sum + (split.amount || 0), 0);
      if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
        throw new Error('Split amounts must equal total expense amount');
      }
    } else if (splitType === SplitType.SHARES) {
      const totalShares = splits.reduce((sum, split) => sum + (split.shares || 0), 0);
      if (totalShares <= 0) {
        throw new Error('Total shares must be greater than 0');
      }
    }

    // Validate payer amounts
    const totalPaid = payers.reduce((sum, payer) => sum + payer.amount, 0);
    if (Math.abs(totalPaid - totalAmount) > 0.01) {
      throw new Error('Payer amounts must equal total expense amount');
    }
  }

  private formatTemplateResponse(template: any): ExpenseTemplateResponse {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      amount: Number(template.amount),
      currency: template.group.defaultCurrency,
      group: template.group,
      createdBy: template.createdBy,
      category: template.category,
      splits: template.splits,
      payers: template.payers,
      tags: [], // Templates don't have tags, they have tagNames
      isRecurring: template.isRecurring,
      recurringPattern: template.recurringPattern,
      nextRecurringDate: template.nextRecurringDate?.toISOString(),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
} 