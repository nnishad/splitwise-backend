import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ExchangeRateService } from './exchangeRateService';
import {
  UserBalance,
  DebtBreakdown,
  SimplifiedDebt,
  GroupBalancesResponse,
  UserBalanceResponse,
  DebtBreakdownResponse,
  GetBalancesRequest,
  GetDebtsRequest,
  CreateSettlementRequest,
  RealTimeBalanceResponse,
  SettlementType
} from '../types/balance';

export class BalanceService {
  private prisma: PrismaClient;
  private exchangeRateService: ExchangeRateService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.exchangeRateService = new ExchangeRateService(prisma);
  }

  /**
   * Get all user balances for a group
   */
  async getGroupBalances(groupId: string, request?: GetBalancesRequest): Promise<GroupBalancesResponse> {
    // Get group info
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { 
        members: {
          include: {
            user: true
          }
        }
      }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const targetCurrency = request?.currency || group.preferredCurrency || group.defaultCurrency;

    // Get all expenses for the group
    const expenses = await this.prisma.expense.findMany({
      where: { 
        groupId,
        isArchived: false
      },
      include: {
        splits: {
          include: { user: true }
        },
        payers: {
          include: { user: true }
        }
      }
    });

    // Calculate balances per user per currency
    const userBalances = new Map<string, Map<string, number>>();
    const userNames = new Map<string, string>();

    // Initialize user balances
    for (const member of group.members) {
      userBalances.set(member.userId, new Map());
      userNames.set(member.userId, member.user.name);
    }

    // Calculate expenses and splits
    for (const expense of expenses) {
      const expenseCurrency = expense.currency;
      
      // Add what each user paid
      for (const payer of expense.payers) {
        const currentBalance = userBalances.get(payer.userId)?.get(expenseCurrency) || 0;
        userBalances.get(payer.userId)?.set(expenseCurrency, currentBalance + Number(payer.amount));
      }

      // Subtract what each user owes
      for (const split of expense.splits) {
        const currentBalance = userBalances.get(split.userId)?.get(expenseCurrency) || 0;
        userBalances.get(split.userId)?.set(expenseCurrency, currentBalance - Number(split.amount));
      }
    }

    // Get settlements
    const settlements = await this.prisma.settlement.findMany({
      where: { 
        groupId,
        status: 'COMPLETED'
      }
    });

    // Apply settlements
    for (const settlement of settlements) {
      const settlementCurrency = settlement.currency;
      const amount = Number(settlement.amount);

      // From user pays (negative balance)
      const fromBalance = userBalances.get(settlement.fromUserId)?.get(settlementCurrency) || 0;
      userBalances.get(settlement.fromUserId)?.set(settlementCurrency, fromBalance - amount);

      // To user receives (positive balance)
      const toBalance = userBalances.get(settlement.toUserId)?.get(settlementCurrency) || 0;
      userBalances.get(settlement.toUserId)?.set(settlementCurrency, toBalance + amount);
    }

    // Convert to response format
    const balances: UserBalance[] = [];
    let totalGroupExpense = 0;
    
    for (const [userId, userBalancesMap] of userBalances) {
      let totalPaid = 0;
      let totalOwed = 0;

      for (const [currency, amount] of userBalancesMap) {
        if (amount > 0) {
          totalPaid += amount;
        } else if (amount < 0) {
          totalOwed += Math.abs(amount);
        }
      }

      totalGroupExpense += totalPaid;

      balances.push({
        userId,
        userName: userNames.get(userId) || 'Unknown User',
        userAvatar: undefined, // Would need to fetch from user data
        totalPaid,
        totalOwed,
        netBalance: totalPaid - totalOwed,
        currency: targetCurrency,
        displayAmount: this.exchangeRateService.formatAmount(totalPaid - totalOwed, targetCurrency)
      });
    }

    return {
      groupId: group.id,
      groupName: group.name,
      defaultCurrency: group.defaultCurrency,
      balances,
      totalGroupExpense,
      displayTotalAmount: this.exchangeRateService.formatAmount(totalGroupExpense, targetCurrency)
    };
  }

  /**
   * Get simplified debt structure (minimizes number of payments)
   */
  /**
   * Get simplified debts using the optimal algorithm to minimize transactions
   * Based on the "Minimum Transaction Algorithm" for debt simplification
   */
  async getSimplifiedDebts(groupId: string, displayCurrency?: string): Promise<SimplifiedDebt[]> {
    const balances = await this.getGroupBalances(groupId, { currency: displayCurrency });
    
    // Get all debts (who owes whom)
    const debts = await this.calculateAllDebts(groupId, displayCurrency || 'USD');
    
    // Use the optimal debt simplification algorithm
    return this.simplifyDebtsOptimally(debts);
  }

  /**
   * Optimal debt simplification algorithm
   * This algorithm minimizes the number of transactions needed to settle all debts
   */
  private simplifyDebtsOptimally(debts: DebtBreakdown[]): SimplifiedDebt[] {
    if (debts.length === 0) return [];

    // Create a graph representation of debts
    const debtGraph = new Map<string, Map<string, number>>();
    
    // Build the debt graph
    for (const debt of debts) {
      if (!debtGraph.has(debt.fromUserId)) {
        debtGraph.set(debt.fromUserId, new Map());
      }
      if (!debtGraph.has(debt.toUserId)) {
        debtGraph.set(debt.toUserId, new Map());
      }
      
      const fromUserDebts = debtGraph.get(debt.fromUserId)!;
      const toUserDebts = debtGraph.get(debt.toUserId)!;
      
      // Add debt from fromUser to toUser
      fromUserDebts.set(debt.toUserId, (fromUserDebts.get(debt.toUserId) || 0) + debt.amount);
      
      // Add reverse debt (negative) from toUser to fromUser
      toUserDebts.set(debt.fromUserId, (toUserDebts.get(debt.fromUserId) || 0) - debt.amount);
    }

    // Calculate net balances for each user
    const netBalances = new Map<string, number>();
    for (const [userId, userDebts] of debtGraph) {
      let netBalance = 0;
      for (const [otherUserId, amount] of userDebts) {
        netBalance += amount;
      }
      netBalances.set(userId, netBalance);
    }

    // Separate debtors (negative balance) and creditors (positive balance)
    const debtors: Array<{ userId: string; amount: number; userName: string }> = [];
    const creditors: Array<{ userId: string; amount: number; userName: string }> = [];

    for (const [userId, balance] of netBalances) {
      if (balance < 0) {
        debtors.push({ userId, amount: Math.abs(balance), userName: this.getUserName(userId) });
      } else if (balance > 0) {
        creditors.push({ userId, amount: balance, userName: this.getUserName(userId) });
      }
    }

    // Sort by amount (largest first for optimal matching)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const simplifiedDebts: SimplifiedDebt[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      const amount = Math.min(debtor.amount, creditor.amount);

      simplifiedDebts.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.userName,
        toUserId: creditor.userId,
        toUserName: creditor.userName,
        amount,
        currency: 'USD', // Default currency - should be determined by group
        displayAmount: this.exchangeRateService.formatAmount(amount, 'USD'),
        originalDebts: this.findOriginalDebts(debtor.userId, creditor.userId, debts)
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount === 0) debtorIndex++;
      if (creditor.amount === 0) creditorIndex++;
    }

    return simplifiedDebts;
  }

  /**
   * Find original debts between two users
   */
  private findOriginalDebts(fromUserId: string, toUserId: string, debts: DebtBreakdown[]): string[] {
    return debts
      .filter(debt => 
        (debt.fromUserId === fromUserId && debt.toUserId === toUserId) ||
        (debt.fromUserId === toUserId && debt.toUserId === fromUserId)
      )
      .map(debt => `${debt.fromUserId}-${debt.toUserId}-${debt.amount}`);
  }

  /**
   * Get user name by ID (placeholder - should be implemented with user lookup)
   */
  private getUserName(userId: string): string {
    // This should be implemented with actual user lookup
    return `User ${userId}`;
  }

  /**
   * Create a new settlement
   */
  async createSettlement(groupId: string, data: CreateSettlementRequest, userId: string): Promise<any> {
    // Validate that user is involved in the settlement
    if (data.fromUserId !== userId && data.toUserId !== userId) {
      throw new Error('You can only create settlements involving yourself');
    }

    // Validate group membership
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('You are not a member of this group');
    }

    // Get group default currency
    const group = await this.prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Validate currency
    const currency = data.currency || group.defaultCurrency;
    if (!this.exchangeRateService.isValidCurrency(currency)) {
      throw new Error(`Invalid currency: ${currency}`);
    }

    let exchangeRate: number | null = null;
    let convertedAmount: number | null = null;
    let originalCurrency: string | null = null;

    // Handle currency conversion if settlement currency differs from group default
    if (data.currency !== group.defaultCurrency) {
      originalCurrency = currency;
      
      if (data.exchangeRateOverride) {
        // Use custom exchange rate
        exchangeRate = data.exchangeRateOverride;
        convertedAmount = data.amount * exchangeRate;
      } else {
        // Fetch live exchange rate
        try {
          const rateInfo = await this.exchangeRateService.getExchangeRate(
            currency, 
            group.defaultCurrency
          );
          exchangeRate = rateInfo.rate;
          convertedAmount = data.amount * (exchangeRate || 1);
        } catch (error) {
          throw new Error(`Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Create settlement
    const settlement = await this.prisma.settlement.create({
      data: {
        groupId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        amount: new Decimal(data.amount),
        currency: currency,
        exchangeRate: exchangeRate ? new Decimal(exchangeRate) : null,
        originalCurrency: originalCurrency,
        convertedAmount: convertedAmount ? new Decimal(convertedAmount) : null,
        notes: data.notes,
        status: 'PENDING'
      },
      include: {
        group: true,
        fromUser: {
          select: { id: true, name: true }
        },
        toUser: {
          select: { id: true, name: true }
        }
      }
    });

    return settlement;
  }

  /**
   * Complete a settlement
   */
  async completeSettlement(settlementId: string, userId: string): Promise<any> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { group: true }
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    // Check if user is involved in the settlement
    if (settlement.fromUserId !== userId && settlement.toUserId !== userId) {
      throw new Error('You can only complete settlements involving yourself');
    }

    const updatedSettlement = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'COMPLETED',
        settledAt: new Date()
      },
      include: {
        group: true,
        fromUser: {
          select: { id: true, name: true }
        },
        toUser: {
          select: { id: true, name: true }
        }
      }
    });

    return updatedSettlement;
  }

  /**
   * Cancel a settlement
   */
  async cancelSettlement(settlementId: string, userId: string): Promise<any> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { group: true }
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    // Check if user is involved in the settlement
    if (settlement.fromUserId !== userId && settlement.toUserId !== userId) {
      throw new Error('You can only cancel settlements involving yourself');
    }

    const updatedSettlement = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'CANCELLED'
      },
      include: {
        group: true,
        fromUser: {
          select: { id: true, name: true }
        },
        toUser: {
          select: { id: true, name: true }
        }
      }
    });

    return updatedSettlement;
  }

  /**
   * Get settlement history for a group
   */
  async getSettlementHistory(groupId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where: { groupId },
        include: {
          fromUser: {
            select: { id: true, name: true }
          },
          toUser: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.settlement.count({
        where: { groupId }
      })
    ]);

    return {
      settlements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get real-time balance for a group with all current settlements and debts
   */
  async getRealTimeBalance(groupId: string, requestingUserId: string): Promise<RealTimeBalanceResponse> {
    // Validate that requesting user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: requestingUserId } }
    });

    if (!groupMember) {
      throw new Error('You are not a member of this group');
    }

    // Get group info
    const group = await this.prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Get all balances
    const balances = await this.getGroupBalances(groupId, { currency: group.defaultCurrency });

    // Get all debts
    const debts = await this.calculateAllDebts(groupId, group.defaultCurrency);

    // Get all settlements
    const settlements = await this.prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: {
          select: { id: true, name: true, avatar: true }
        },
        toUser: {
          select: { id: true, name: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total group expense
    const totalGroupExpense = balances.totalGroupExpense;

    return {
      groupId,
      groupName: group.name,
      defaultCurrency: group.defaultCurrency,
      balances: balances.balances,
      totalGroupExpense,
      displayTotalAmount: this.exchangeRateService.formatAmount(totalGroupExpense, group.defaultCurrency),
      lastUpdated: new Date().toISOString(),
      settlements: settlements.map(s => ({
        id: s.id,
        groupId: s.groupId,
        fromUserId: s.fromUserId,
        fromUserName: s.fromUser?.name || 'Unknown User',
        fromUserAvatar: s.fromUser?.avatar || undefined,
        toUserId: s.toUserId,
        toUserName: s.toUser?.name || 'Unknown User',
        toUserAvatar: s.toUser?.avatar || undefined,
        amount: Number(s.amount),
        currency: s.currency,
        exchangeRate: s.exchangeRate ? Number(s.exchangeRate) : undefined,
        originalCurrency: s.originalCurrency || undefined,
        convertedAmount: s.convertedAmount ? Number(s.convertedAmount) : undefined,
        notes: s.notes || undefined,
        status: s.status,
        settlementType: s.settlementType || SettlementType.FULL,
        partialAmount: s.partialAmount ? Number(s.partialAmount) : undefined,
        originalSplitId: s.originalSplitId || undefined,
        settledAt: s.settledAt?.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString()
      })),
      debts
    };
  }

  /**
   * Get user balance for a specific user in a group
   */
  async getUserBalance(groupId: string, userId: string, requestingUserId: string): Promise<UserBalanceResponse> {
    // Validate that requesting user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: requestingUserId } }
    });

    if (!groupMember) {
      throw new Error('You are not a member of this group');
    }

    // Get group info
    const group = await this.prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate user's balance
    const balance = await this.calculateUserBalance(groupId, userId, group.defaultCurrency);

    // Get user's debts
    const debts = await this.calculateUserDebts(groupId, userId, group.defaultCurrency);

    // Get user's settlements
    const settlements = await this.prisma.settlement.findMany({
      where: {
        groupId,
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      include: {
        fromUser: { select: { id: true, name: true, avatar: true } },
        toUser: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar || undefined,
      groupId: group.id,
      groupName: group.name,
      totalPaid: balance.totalPaid,
      totalOwed: balance.totalOwed,
      netBalance: balance.netBalance,
      currency: group.defaultCurrency,
      displayAmount: this.exchangeRateService.formatAmount(balance.netBalance, group.defaultCurrency),
      debts: debts,
      settlements: settlements.map(s => ({
        id: s.id,
        groupId: s.groupId,
        fromUserId: s.fromUserId,
        fromUserName: s.fromUser.name,
        fromUserAvatar: s.fromUser.avatar || undefined,
        toUserId: s.toUserId,
        toUserName: s.toUser.name,
        toUserAvatar: s.toUser.avatar || undefined,
        amount: Number(s.amount),
        currency: s.currency,
        exchangeRate: s.exchangeRate ? Number(s.exchangeRate) : undefined,
        originalCurrency: s.originalCurrency || undefined,
        convertedAmount: s.convertedAmount ? Number(s.convertedAmount) : undefined,
        notes: s.notes || undefined,
        status: s.status as any,
        settlementType: s.settlementType || SettlementType.FULL,
        partialAmount: s.partialAmount ? Number(s.partialAmount) : undefined,
        originalSplitId: s.originalSplitId || undefined,
        settledAt: s.settledAt?.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString()
      }))
    };
  }

  /**
   * Get group debt breakdown
   */
  async getGroupDebts(groupId: string, requestingUserId: string, request?: GetDebtsRequest): Promise<DebtBreakdownResponse> {
    // Validate that requesting user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: requestingUserId } }
    });

    if (!groupMember) {
      throw new Error('You are not a member of this group');
    }

    // Get group info
    const group = await this.prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const targetCurrency = request?.currency || group.defaultCurrency;

    if (request?.simplify) {
      // Return simplified debt structure
      const simplifiedDebts = await this.getSimplifiedDebts(groupId, targetCurrency);
      
      return {
        groupId: group.id,
        groupName: group.name,
        debts: [],
        simplifiedDebts: simplifiedDebts.map(d => ({
          fromUserId: d.fromUserId,
          fromUserName: d.fromUserName,
          toUserId: d.toUserId,
          toUserName: d.toUserName,
          amount: d.amount,
          currency: d.currency,
          displayAmount: d.displayAmount,
          originalDebts: [] // This would need to be tracked during simplification
        })),
        totalDebtAmount: simplifiedDebts.reduce((sum, d) => sum + d.amount, 0),
        displayTotalAmount: this.exchangeRateService.formatAmount(
          simplifiedDebts.reduce((sum, d) => sum + d.amount, 0), 
          targetCurrency
        )
      };
    } else {
      // Return detailed debt breakdown
      const allDebts = await this.calculateAllDebts(groupId, targetCurrency);
      
      return {
        groupId: group.id,
        groupName: group.name,
        debts: allDebts,
        totalDebtAmount: allDebts.reduce((sum, d) => sum + d.amount, 0),
        displayTotalAmount: this.exchangeRateService.formatAmount(
          allDebts.reduce((sum, d) => sum + d.amount, 0), 
          targetCurrency
        )
      };
    }
  }

  /**
   * Calculate user balance
   */
  private async calculateUserBalance(groupId: string, userId: string, currency: string): Promise<{
    totalPaid: number;
    totalOwed: number;
    netBalance: number;
  }> {
    // Get all expenses for the group
    const expenses = await this.prisma.expense.findMany({
      where: { 
        groupId,
        isArchived: false
      },
      include: {
        splits: {
          include: { user: true }
        },
        payers: {
          include: { user: true }
        }
      }
    });

    let totalPaid = 0;
    let totalOwed = 0;

    for (const expense of expenses) {
      // Calculate what this user paid
      const userPayer = expense.payers.find(p => p.userId === userId);
      if (userPayer) {
        if (expense.currency === currency) {
          totalPaid += Number(userPayer.amount);
        } else {
          // Convert to target currency
          try {
            const conversion = await this.exchangeRateService.convertAmount(
              Number(userPayer.amount), 
              expense.currency, 
              currency
            );
            totalPaid += conversion.convertedAmount;
          } catch (error) {
            console.error(`Failed to convert payment: ${error}`);
          }
        }
      }

      // Calculate what this user owes
      const userSplit = expense.splits.find(s => s.userId === userId);
      if (userSplit) {
        if (expense.currency === currency) {
          totalOwed += Number(userSplit.amount);
        } else {
          // Convert to target currency
          try {
            const conversion = await this.exchangeRateService.convertAmount(
              Number(userSplit.amount), 
              expense.currency, 
              currency
            );
            totalOwed += conversion.convertedAmount;
          } catch (error) {
            console.error(`Failed to convert split: ${error}`);
          }
        }
      }
    }

    return {
      totalPaid,
      totalOwed,
      netBalance: totalPaid - totalOwed
    };
  }

  /**
   * Calculate user debts
   */
  private async calculateUserDebts(groupId: string, userId: string, currency: string): Promise<DebtBreakdown[]> {
    // This is a simplified implementation
    // In a real implementation, you would calculate all debts between users
    return [];
  }

  /**
   * Calculate all debts in the group
   */
  private async calculateAllDebts(groupId: string, currency: string): Promise<DebtBreakdown[]> {
    // This is a simplified implementation
    // In a real implementation, you would calculate all debts between all users
    return [];
  }
} 