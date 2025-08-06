import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { 
  CreateExpenseRequest, 
  UpdateExpenseRequest, 
  SearchExpensesRequest,
  FilterExpensesRequest,
  BulkUpdateExpenseRequest,
  BulkDeleteExpenseRequest,
  ExpenseResponse,
  ExpenseListResponse,
  CategoryResponse,
  TagResponse,
  ExpenseSummaryResponse,
  SplitType,
  ExpenseAction,
  RecurringPattern
} from '../types/expense';
import { ExchangeRateService } from './exchangeRateService';
import { AuditService } from './auditService';
import { AuditAction, EntityType } from '../types/audit';

export class ExpenseService {
  private prisma: PrismaClient;
  private exchangeRateService: ExchangeRateService;
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.exchangeRateService = new ExchangeRateService(prisma);
    this.auditService = new AuditService(prisma);
  }

  /**
   * Create a new expense
   */
  async createExpense(
    groupId: string,
    userId: string,
    data: CreateExpenseRequest
  ): Promise<ExpenseResponse> {
    // Validate group membership
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('You are not a member of this group');
    }

    // Get group info for default currency
    const group = await this.prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Determine expense currency (from request or group default)
    const expenseCurrency = data.currency || group.defaultCurrency;

    // Validate currency
    if (!this.exchangeRateService.isValidCurrency(expenseCurrency)) {
      throw new Error(`Invalid currency: ${expenseCurrency}`);
    }

    // Validate that all users involved can override exchange rates if needed
    const allInvolvedUsers = new Set<string>();
    allInvolvedUsers.add(userId); // Creator

    // Add payers
    if (data.payers) {
      data.payers.forEach(payer => allInvolvedUsers.add(payer.userId));
    }

    // Add splits
    if (data.splits) {
      data.splits.forEach(split => allInvolvedUsers.add(split.userId));
    }

    // Check if any user involved has permission to override exchange rates
    const involvedUsers = await this.prisma.user.findMany({
      where: { id: { in: Array.from(allInvolvedUsers) } },
      select: { id: true, name: true }
    });

    // Validate that all involved users are group members
    const groupMembers = await this.prisma.groupMember.findMany({
      where: { groupId }
    });

    const groupMemberIds = new Set(groupMembers.map((m: any) => m.userId));
    for (const user of involvedUsers) {
      if (!groupMemberIds.has(user.id)) {
        throw new Error(`User ${user.name} is not a member of this group`);
      }
    }

    let exchangeRate: number | null = null;
    let convertedAmount: number | null = null;
    let originalCurrency: string | null = null;

    // Handle currency conversion if expense currency differs from group default
    if (expenseCurrency !== group.defaultCurrency) {
      originalCurrency = expenseCurrency;
      
      if (data.exchangeRateOverride) {
        // Use custom exchange rate (any involved user can provide this)
        exchangeRate = data.exchangeRateOverride;
        convertedAmount = data.amount * exchangeRate;
      } else {
        // Fetch live exchange rate
        try {
          const rateInfo = await this.exchangeRateService.getExchangeRate(
            expenseCurrency, 
            group.defaultCurrency
          );
          exchangeRate = rateInfo.rate;
          convertedAmount = data.amount * exchangeRate;
        } catch (error) {
          throw new Error(`Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Create expense with transaction
    const expense = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdExpense = await tx.expense.create({
        data: {
          groupId,
          createdById: userId,
          title: data.title,
          description: data.description,
          amount: new Decimal(data.amount),
          currency: expenseCurrency,
          exchangeRate: exchangeRate ? new Decimal(exchangeRate) : null,
          originalCurrency: originalCurrency,
          convertedAmount: convertedAmount ? new Decimal(convertedAmount) : null,
          date: data.date ? new Date(data.date) : new Date(),
          location: data.location,
          categoryId: data.categoryId,
          isArchived: false
        }
      });

      // Create payers
      if (data.payers && data.payers.length > 0) {
        await tx.expensePayer.createMany({
          data: data.payers.map(payer => ({
            expenseId: createdExpense.id,
            userId: payer.userId,
            amount: new Decimal(payer.amount)
          }))
        });
      }

      // Create splits
      if (data.splits && data.splits.length > 0) {
        await tx.expenseSplit.createMany({
          data: data.splits.map(split => ({
            expenseId: createdExpense.id,
            userId: split.userId,
            amount: new Decimal(split.amount || 0),
            percentage: split.percentage !== undefined && split.percentage !== null ? new Decimal(split.percentage as number) : null
          }))
        });
      }

      return createdExpense;
    });

    // Get the complete expense with relations
    const completeExpense = await this.prisma.expense.findUnique({
      where: { id: expense.id },
      include: {
        group: {
          select: { id: true, name: true, defaultCurrency: true }
        },
        createdBy: {
          select: { id: true, name: true, avatar: true }
        },
        payers: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        splits: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!completeExpense) {
      throw new Error('Failed to create expense');
    }

    // Log audit entry for expense creation
    try {
      await this.auditService.logAuditEntry(
        EntityType.EXPENSE,
        completeExpense.id,
        AuditAction.CREATED,
        userId,
        groupId,
        null, // No old data for creation
        {
          title: completeExpense.title,
          description: completeExpense.description,
          amount: completeExpense.amount,
          currency: completeExpense.currency,
          exchangeRate: completeExpense.exchangeRate,
          originalCurrency: completeExpense.originalCurrency,
          convertedAmount: completeExpense.convertedAmount,
          date: completeExpense.date,
          location: completeExpense.location,
          categoryId: completeExpense.categoryId
        }
      );
    } catch (auditError) {
      console.error('Failed to log audit entry for expense creation:', auditError);
      // Don't fail the expense creation if audit logging fails
    }

    return this.formatExpenseResponse(completeExpense);
  }

  // Get expenses by group
  async getExpensesByGroup(groupId: string, userId: string): Promise<ExpenseListResponse> {
    // Validate group membership
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('You are not a member of this group');
    }

    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId,
        isDeleted: false
      },
      include: {
        group: true,
        createdBy: true,
        category: true,
        splits: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        payers: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      expenses: expenses.map((expense: any) => this.formatExpenseResponse(expense)),
      pagination: {
        page: 1,
        limit: expenses.length,
        total: expenses.length,
        totalPages: 1
      }
    };
  }

  // Get expense by ID with all related data
  async getExpenseById(expenseId: string, userId: string): Promise<ExpenseResponse> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
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
        splits: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        payers: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    return this.formatExpenseResponse(expense);
  }

  // Update an existing expense
  async updateExpense(expenseId: string, userId: string, data: UpdateExpenseRequest): Promise<ExpenseResponse> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        group: {
          members: {
            some: { userId }
          }
        }
      },
      include: {
        splits: true,
        payers: true,
        tags: { include: { tag: true } }
      }
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    const { splits, payers, tagNames, ...expenseData } = data;

    // Validate splits and payers if provided
    if (splits && payers && data.splitType) {
      this.validateSplitsAndPayers(splits, payers, data.amount || Number(expense.amount), data.splitType);
    }

    return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Store old data for history
      const oldData = { ...expense };

      // Update the expense
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          ...expenseData,
          amount: data.amount ? new Decimal(data.amount) : undefined,
          date: data.date ? new Date(data.date) : undefined,
          nextRecurringDate: data.nextRecurringDate ? new Date(data.nextRecurringDate) : undefined,
        },
        include: {
          group: true,
          createdBy: true,
          category: true,
          splits: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            }
          },
          payers: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Update splits if provided
      if (splits && data.splitType) {
        await tx.expenseSplit.deleteMany({ where: { expenseId } });
        const splitData = this.calculateSplits(splits, data.amount || Number(expense.amount), data.splitType);
        await tx.expenseSplit.createMany({
          data: splitData.map(split => ({
            expenseId,
            userId: split.userId,
            amount: new Decimal(split.amount || 0),
            percentage: split.percentage ? new Decimal(split.percentage) : null,
            shares: split.shares || null,
          }))
        });
      }

      // Update payers if provided
      if (payers) {
        await tx.expensePayer.deleteMany({ where: { expenseId } });
        await tx.expensePayer.createMany({
          data: payers.map(payer => ({
            expenseId,
            userId: payer.userId,
            amount: new Decimal(payer.amount),
          }))
        });
      }

      // Update tags if provided
      if (tagNames) {
        await tx.expenseTag.deleteMany({ where: { expenseId } });
        if (tagNames.length > 0) {
          const tags = await this.ensureTagsExist(tx, tagNames);
          await tx.expenseTag.createMany({
            data: tags.map(tag => ({
              expenseId,
              tagId: tag.id,
            }))
          });
        }
      }

      // Record history
      await tx.expenseHistory.create({
        data: {
          expenseId,
          action: ExpenseAction.UPDATED,
          oldData,
          newData: updatedExpense,
          userId,
        }
      });

      // Log audit entry for expense update
      try {
        await this.auditService.logAuditEntry(
          EntityType.EXPENSE,
          expenseId,
          AuditAction.UPDATED,
          userId,
          expense.groupId,
          {
            title: oldData.title,
            description: oldData.description,
            amount: oldData.amount,
            currency: oldData.currency,
            exchangeRate: oldData.exchangeRate,
            originalCurrency: oldData.originalCurrency,
            convertedAmount: oldData.convertedAmount,
            date: oldData.date,
            location: oldData.location,
            categoryId: oldData.categoryId
          },
          {
            title: updatedExpense.title,
            description: updatedExpense.description,
            amount: updatedExpense.amount,
            currency: updatedExpense.currency,
            exchangeRate: updatedExpense.exchangeRate,
            originalCurrency: updatedExpense.originalCurrency,
            convertedAmount: updatedExpense.convertedAmount,
            date: updatedExpense.date,
            location: updatedExpense.location,
            categoryId: updatedExpense.categoryId
          }
        );
      } catch (auditError) {
        console.error('Failed to log audit entry for expense update:', auditError);
        // Don't fail the expense update if audit logging fails
      }

      return this.formatExpenseResponse(updatedExpense);
    });
  }

  // Delete an expense (soft delete by archiving)
  async deleteExpense(expenseId: string, userId: string): Promise<void> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        group: {
          members: {
            some: { userId }
          }
        }
      }
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Archive the expense
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        }
      });

      // Record history
      await tx.expenseHistory.create({
        data: {
          expenseId,
          action: ExpenseAction.ARCHIVED,
          userId,
        }
      });

      // Log audit entry for expense deletion
      try {
        await this.auditService.logAuditEntry(
          EntityType.EXPENSE,
          expenseId,
          AuditAction.DELETED,
          userId,
          expense.groupId,
          {
            title: expense.title,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
            exchangeRate: expense.exchangeRate,
            originalCurrency: expense.originalCurrency,
            convertedAmount: expense.convertedAmount,
            date: expense.date,
            location: expense.location,
            categoryId: expense.categoryId,
            isArchived: false
          },
          {
            title: expense.title,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
            exchangeRate: expense.exchangeRate,
            originalCurrency: expense.originalCurrency,
            convertedAmount: expense.convertedAmount,
            date: expense.date,
            location: expense.location,
            categoryId: expense.categoryId,
            isArchived: true,
            archivedAt: new Date()
          }
        );
      } catch (auditError) {
        console.error('Failed to log audit entry for expense deletion:', auditError);
        // Don't fail the expense deletion if audit logging fails
      }
    });
  }

  // Restore an archived expense
  async restoreExpense(expenseId: string, userId: string): Promise<ExpenseResponse> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        group: {
          members: {
            some: { userId }
          }
        }
      }
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const restoredExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          isArchived: false,
          archivedAt: null,
        },
        include: {
          group: true,
          createdBy: true,
          category: true,
          splits: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            }
          },
          payers: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Record history
      await tx.expenseHistory.create({
        data: {
          expenseId,
          action: ExpenseAction.RESTORED,
          userId,
        }
      });

      return this.formatExpenseResponse(restoredExpense);
    });
  }

  // Search and filter expenses
  async searchExpenses(userId: string, filters: SearchExpensesRequest): Promise<ExpenseListResponse> {
    const {
      query,
      groupId,
      userId: filterUserId,
      categoryId,
      tagNames,
      dateFrom,
      dateTo,
      amountFrom,
      amountTo,
      currency,
      isArchived,
      isRecurring,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = filters;

    const where = {
      isDeleted: false,
      ...(query && {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      }),
      ...(groupId && { groupId }),
      ...(filterUserId && {
        OR: [
          { createdById: filterUserId },
          { splits: { some: { userId: filterUserId } } },
          { payers: { some: { userId: filterUserId } } }
        ]
      }),
      ...(categoryId && { categoryId }),
      ...(tagNames && tagNames.length > 0 && {
        tags: { some: { tag: { name: { in: tagNames } } } }
      }),
      ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
      ...(dateTo && { date: { lte: new Date(dateTo) } }),
      ...(amountFrom && { amount: { gte: new Decimal(amountFrom) } }),
      ...(amountTo && { amount: { lte: new Decimal(amountTo) } }),
      ...(currency && { currency }),
      ...(isArchived !== undefined && { isArchived }),
      ...(isRecurring !== undefined && { isRecurring })
    };

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          group: true,
          createdBy: true,
          category: true,
          splits: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            }
          },
          payers: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.expense.count({ where })
    ]);

    const formattedExpenses = expenses.map((expense: any) => this.formatExpenseResponse(expense));

    return {
      expenses: formattedExpenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Bulk operations
  async bulkUpdateExpenses(userId: string, data: BulkUpdateExpenseRequest): Promise<void> {
    const { expenseIds, updates } = data;

    // Verify user has access to all expenses
    const accessibleExpenses = await this.prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        group: {
          members: {
            some: { userId }
          }
        }
      }
    });

    if (accessibleExpenses.length !== expenseIds.length) {
      throw new Error('User does not have access to all specified expenses');
    }

    await this.prisma.expense.updateMany({
      where: { id: { in: expenseIds } },
      data: updates
    });
  }

  async bulkDeleteExpenses(userId: string, data: BulkDeleteExpenseRequest): Promise<void> {
    const { expenseIds } = data;

    // Verify user has access to all expenses
    const accessibleExpenses = await this.prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        group: {
          members: {
            some: { userId }
          }
        }
      }
    });

    if (accessibleExpenses.length !== expenseIds.length) {
      throw new Error('User does not have access to all specified expenses');
    }

    await this.prisma.expense.updateMany({
      where: { id: { in: expenseIds } },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      }
    });
  }

  // Category management
  async getCategories(): Promise<CategoryResponse[]> {
    const categories = await this.prisma.category.findMany({
      where: { isArchived: false },
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    });

    return categories.map((category: any) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isDefault: category.isDefault,
      expenseCount: category._count.expenses
    }));
  }

  // Tag management
  async getTags(): Promise<TagResponse[]> {
    const tags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    });

    return tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      expenseCount: tag._count.expenses
    }));
  }

  // Get expense summary/statistics
  async getExpenseSummary(userId: string, groupId?: string): Promise<ExpenseSummaryResponse> {
    const where = {
      isDeleted: false,
      isArchived: false,
      ...(groupId && { groupId })
    };

    const [expenses, categoryBreakdown, monthlyBreakdown, currencyBreakdown] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        select: {
          amount: true,
          currency: true,
          convertedAmount: true,
          categoryId: true,
          date: true
        }
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _count: { id: true },
        _sum: { amount: true }
      }),
      this.prisma.expense.groupBy({
        by: ['date'],
        where,
        _count: { id: true },
        _sum: { amount: true }
      }),
      this.prisma.expense.groupBy({
        by: ['currency'],
        where,
        _count: { id: true },
        _sum: { amount: true, convertedAmount: true }
      })
    ]);

    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);
    const averageAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    // Get group default currency for summary
    const group = groupId ? await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { defaultCurrency: true }
    }) : null;
    const summaryCurrency = group?.defaultCurrency || 'USD';

    return {
      totalExpenses,
      totalAmount,
      currency: summaryCurrency,
      averageAmount,
      categoryBreakdown: categoryBreakdown.map((cat: any) => ({
        categoryId: cat.categoryId || 'uncategorized',
        categoryName: cat.categoryId ? 'Category Name' : 'Uncategorized', // You might want to fetch category names
        count: cat._count.id,
        amount: Number(cat._sum.amount || 0)
      })),
      monthlyBreakdown: monthlyBreakdown.map((month: any) => ({
        month: month.date.toISOString().slice(0, 7), // YYYY-MM format
        count: month._count.id,
        amount: Number(month._sum.amount || 0)
      })),
      currencyBreakdown: currencyBreakdown.map((curr: any) => ({
        currency: curr.currency,
        count: curr._count.id,
        amount: Number(curr._sum.amount || 0),
        convertedAmount: Number(curr._sum.convertedAmount || 0)
      }))
    };
  }

  // Undo last action (get last history entry)
  async getLastAction(expenseId: string, userId: string): Promise<any> {
    const lastAction = await this.prisma.expenseHistory.findFirst({
      where: {
        expenseId,
        userId
      },
      orderBy: { createdAt: 'desc' }
    });

    return lastAction;
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

  private calculateSplits(splits: any[], totalAmount: number, splitType: SplitType): any[] {
    if (splitType === SplitType.EQUAL) {
      const equalAmount = totalAmount / splits.length;
      return splits.map(split => ({
        ...split,
        amount: equalAmount,
        percentage: (equalAmount / totalAmount) * 100
      }));
    } else if (splitType === SplitType.PERCENTAGE) {
      return splits.map(split => ({
        ...split,
        amount: (split.percentage! / 100) * totalAmount
      }));
    } else if (splitType === SplitType.SHARES) {
      const totalShares = splits.reduce((sum, split) => sum + (split.shares || 0), 0);
      return splits.map(split => ({
        ...split,
        amount: (split.shares! / totalShares) * totalAmount,
        percentage: (split.shares! / totalShares) * 100
      }));
    }
    return splits; // AMOUNT type - amounts are already provided
  }

  private async ensureTagsExist(tx: Prisma.TransactionClient, tagNames: string[]): Promise<any[]> {
    const existingTags = await tx.tag.findMany({
      where: { name: { in: tagNames } }
    });

    const existingTagNames = existingTags.map((tag: any) => tag.name);
    const newTagNames = tagNames.filter(name => !existingTagNames.includes(name));

    let newTags: any[] = [];
    if (newTagNames.length > 0) {
      newTags = await tx.tag.createMany({
        data: newTagNames.map(name => ({ name })),
        skipDuplicates: true
      });
    }

    const allTags = await tx.tag.findMany({
      where: { name: { in: tagNames } }
    });

    return allTags;
  }

  private formatExpenseResponse(expense: any): ExpenseResponse {
    const totalPaid = expense.payers?.reduce((sum: number, payer: any) => sum + Number(payer.amount), 0) || 0;
    const totalSplit = expense.splits?.reduce((sum: number, split: any) => sum + Number(split.amount), 0) || 0;

    // Format currency amounts
    const displayAmount = this.exchangeRateService.formatAmount(Number(expense.amount), expense.currency);
    const displayConvertedAmount = expense.convertedAmount 
      ? this.exchangeRateService.formatAmount(Number(expense.convertedAmount), expense.group.defaultCurrency)
      : undefined;

    return {
      id: expense.id,
      title: expense.title,
      description: expense.description,
      amount: Number(expense.amount),
      currency: expense.currency,
      exchangeRate: expense.exchangeRate ? Number(expense.exchangeRate) : undefined,
      originalCurrency: expense.originalCurrency || undefined,
      convertedAmount: expense.convertedAmount ? Number(expense.convertedAmount) : undefined,
      date: expense.date.toISOString(),
      location: expense.location,

      isArchived: expense.isArchived,
      archivedAt: expense.archivedAt?.toISOString(),
      isRecurring: expense.isRecurring,
      recurringPattern: expense.recurringPattern,
      nextRecurringDate: expense.nextRecurringDate?.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
      group: expense.group,
      createdBy: expense.createdBy,
      category: expense.category,
      splits: expense.splits?.map((split: any) => ({
        ...split,
        amount: Number(split.amount),
        percentage: split.percentage ? Number(split.percentage) : undefined
      })) || [],
      payers: expense.payers?.map((payer: any) => ({
        ...payer,
        amount: Number(payer.amount)
      })) || [],
      tags: expense.tags?.map((expenseTag: any) => expenseTag.tag) || [],
      comments: expense.comments || [],
      totalPaid,
      totalSplit,
      balance: totalPaid - totalSplit,
      displayAmount,
      displayConvertedAmount
    };
  }
} 