import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  Settlement,
  SettlementResponse,
  SettlementListResponse,
  CreateSettlementRequest,
  UpdateSettlementRequest,
  SettlementStatus,
  SettlementType,
  SettlementAction,
  SettlementHistory
} from '../types/balance';
import { ExchangeRateService } from './exchangeRateService';

export class SettlementService {
  private prisma: PrismaClient;
  private exchangeRateService: ExchangeRateService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.exchangeRateService = new ExchangeRateService(prisma);
  }

  // Create a new settlement
  async createSettlement(
    groupId: string,
    userId: string,
    data: CreateSettlementRequest
  ): Promise<SettlementResponse> {
    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Verify both users are members of the group
    const fromUserMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: data.fromUserId } }
    });

    const toUserMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: data.toUserId } }
    });

    if (!fromUserMember || !toUserMember) {
      throw new Error('One or both users are not members of this group');
    }

    // Verify users are different
    if (data.fromUserId === data.toUserId) {
      throw new Error('Cannot create settlement between the same user');
    }

    // Get group to use its default currency
    const group = await this.prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Determine the currency to use
    const settlementCurrency = data.currency || group.defaultCurrency;
    
    // Validate currency
    if (!this.exchangeRateService.isValidCurrency(settlementCurrency)) {
      throw new Error(`Invalid currency: ${settlementCurrency}`);
    }

    // Validate amount
    if (data.amount <= 0) {
      throw new Error('Settlement amount must be greater than 0');
    }

    return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let exchangeRate: number | null = null;
      let convertedAmount: number | null = null;
      let originalCurrency: string | null = null;

      // Handle currency conversion if settlement currency differs from group default
      if (settlementCurrency !== group.defaultCurrency) {
        originalCurrency = settlementCurrency;
        
        if (data.exchangeRateOverride) {
          // Use custom exchange rate
          exchangeRate = data.exchangeRateOverride;
          convertedAmount = data.amount * exchangeRate;
        } else {
          // Fetch live exchange rate
          try {
            const rateInfo = await this.exchangeRateService.getExchangeRate(
              settlementCurrency, 
              group.defaultCurrency
            );
            exchangeRate = rateInfo.rate;
            convertedAmount = data.amount * exchangeRate;
          } catch (error) {
            throw new Error(`Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Create the settlement
      const settlement = await tx.settlement.create({
        data: {
          groupId,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          amount: new Decimal(data.amount),
          currency: settlementCurrency,
          exchangeRate: exchangeRate ? new Decimal(exchangeRate) : null,
          originalCurrency: originalCurrency,
          convertedAmount: convertedAmount ? new Decimal(convertedAmount) : null,
          notes: data.notes,
          status: SettlementStatus.PENDING
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              defaultCurrency: true
            }
          },
          fromUser: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          toUser: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      return this.formatSettlementResponse(settlement);
    });
  }

  // Get settlement by ID
  async getSettlementById(
    settlementId: string,
    userId: string
  ): Promise<SettlementResponse> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            defaultCurrency: true
          }
        },
        fromUser: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: settlement.groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    return this.formatSettlementResponse(settlement);
  }

  // Update settlement
  async updateSettlement(
    settlementId: string,
    userId: string,
    data: UpdateSettlementRequest
  ): Promise<SettlementResponse> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            defaultCurrency: true
          }
        }
      }
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: settlement.groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Only allow updates to pending settlements
    if (settlement.status !== SettlementStatus.PENDING) {
      throw new Error('Cannot update completed or cancelled settlements');
    }

    return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let exchangeRate: number | null = settlement.exchangeRate ? Number(settlement.exchangeRate) : null;
      let convertedAmount: number | null = settlement.convertedAmount ? Number(settlement.convertedAmount) : null;
      let originalCurrency: string | null = settlement.originalCurrency;

      // Handle currency conversion if currency is being updated
      if (data.currency && data.currency !== settlement.currency) {
        originalCurrency = data.currency;
        
        if (data.exchangeRateOverride) {
          exchangeRate = data.exchangeRateOverride;
          convertedAmount = (data.amount || Number(settlement.amount)) * exchangeRate;
        } else {
          try {
            const rateInfo = await this.exchangeRateService.getExchangeRate(
              data.currency, 
              settlement.group.defaultCurrency
            );
            exchangeRate = rateInfo.rate;
            convertedAmount = (data.amount || Number(settlement.amount)) * exchangeRate;
          } catch (error) {
            throw new Error(`Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Update the settlement
      const updatedSettlement = await tx.settlement.update({
        where: { id: settlementId },
        data: {
          amount: data.amount ? new Decimal(data.amount) : undefined,
          currency: data.currency,
          exchangeRate: exchangeRate ? new Decimal(exchangeRate) : undefined,
          originalCurrency: originalCurrency,
          convertedAmount: convertedAmount ? new Decimal(convertedAmount) : undefined,
          notes: data.notes,
          status: data.status,
          settledAt: data.status === SettlementStatus.COMPLETED ? new Date() : undefined
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              defaultCurrency: true
            }
          },
          fromUser: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          toUser: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      return this.formatSettlementResponse(updatedSettlement);
    });
  }

  // Delete settlement
  async deleteSettlement(
    settlementId: string,
    userId: string
  ): Promise<void> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId }
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: settlement.groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Only allow deletion of pending settlements
    if (settlement.status !== SettlementStatus.PENDING) {
      throw new Error('Cannot delete completed or cancelled settlements');
    }

    await this.prisma.settlement.delete({
      where: { id: settlementId }
    });
  }

  // Get settlements for a group
  async getGroupSettlements(
    groupId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: SettlementStatus
  ): Promise<SettlementListResponse> {
    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Build where clause
    const where: any = { groupId };
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await this.prisma.settlement.count({ where });

    // Get settlements with pagination
    const settlements = await this.prisma.settlement.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            defaultCurrency: true
          }
        },
        fromUser: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      settlements: settlements.map(this.formatSettlementResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Mark settlement as completed
  async completeSettlement(
    settlementId: string,
    userId: string
  ): Promise<SettlementResponse> {
    return this.updateSettlement(settlementId, userId, {
      status: SettlementStatus.COMPLETED
    });
  }

  // Mark settlement as cancelled
  async cancelSettlement(
    settlementId: string,
    userId: string
  ): Promise<SettlementResponse> {
    return this.updateSettlement(settlementId, userId, {
      status: SettlementStatus.CANCELLED
    });
  }

  // Private helper methods
  private formatSettlementResponse(settlement: any): SettlementResponse {
    return {
      id: settlement.id,
      groupId: settlement.groupId,
      groupName: settlement.group.name,
      fromUserId: settlement.fromUserId,
      fromUserName: settlement.fromUser?.name || 'Unknown User',
      fromUserAvatar: settlement.fromUser?.avatar,
      toUserId: settlement.toUserId,
      toUserName: settlement.toUser?.name || 'Unknown User',
      toUserAvatar: settlement.toUser?.avatar,
      amount: Number(settlement.amount),
      currency: settlement.currency,
      exchangeRate: settlement.exchangeRate ? Number(settlement.exchangeRate) : undefined,
      originalCurrency: settlement.originalCurrency,
      convertedAmount: settlement.convertedAmount ? Number(settlement.convertedAmount) : undefined,
      notes: settlement.notes,
      status: settlement.status,
      settlementType: settlement.settlementType || SettlementType.FULL,
      partialAmount: settlement.partialAmount ? Number(settlement.partialAmount) : undefined,
      originalSplitId: settlement.originalSplitId || undefined,
      settledAt: settlement.settledAt?.toISOString(),
      createdAt: settlement.createdAt.toISOString(),
      updatedAt: settlement.updatedAt.toISOString(),
      displayAmount: this.exchangeRateService.formatAmount(Number(settlement.amount), settlement.currency)
    };
  }

  // Create partial settlement
  async createPartialSettlement(
    groupId: string,
    userId: string,
    data: CreateSettlementRequest
  ): Promise<SettlementResponse> {
    if (!data.partialAmount || !data.originalSplitId) {
      throw new Error('Partial settlements require partialAmount and originalSplitId');
    }

    // Validate the original split exists and belongs to the group
    const originalSplit = await this.prisma.expenseSplit.findFirst({
      where: {
        id: data.originalSplitId,
        expense: { groupId }
      }
    });

    if (!originalSplit) {
      throw new Error('Original split not found or does not belong to this group');
    }

    if (data.partialAmount > Number(originalSplit.amount) - Number(originalSplit.settledAmount)) {
      throw new Error('Partial amount exceeds remaining unsettled amount');
    }

    // Create the settlement with partial type
    const settlementData = {
      ...data,
      settlementType: SettlementType.PARTIAL,
      partialAmount: data.partialAmount,
      originalSplitId: data.originalSplitId
    };

    const settlement = await this.createSettlement(groupId, userId, settlementData);

    // Update the expense split's settled amount
    await this.updateExpenseSplitSettlement(data.originalSplitId, data.partialAmount);

    return settlement;
  }

  // Update expense split settlement amount
  private async updateExpenseSplitSettlement(splitId: string, settledAmount: number): Promise<void> {
    await this.prisma.expenseSplit.update({
      where: { id: splitId },
      data: {
        settledAmount: {
          increment: new Decimal(settledAmount)
        },
        lastSettlementDate: new Date()
      }
    });
  }

  // Create settlement history entry
  private async createSettlementHistory(
    settlementId: string,
    action: SettlementAction,
    amount: number,
    currency: string,
    notes?: string
  ): Promise<void> {
    await this.prisma.settlementHistory.create({
      data: {
        settlementId,
        action,
        amount: new Decimal(amount),
        currency,
        notes
      }
    });
  }

  // Get settlement history
  async getSettlementHistory(
    settlementId: string,
    userId: string
  ): Promise<SettlementHistory[]> {
    // Verify user has access to this settlement
    const settlement = await this.prisma.settlement.findFirst({
      where: {
        id: settlementId,
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      }
    });

    if (!settlement) {
      throw new Error('Settlement not found or access denied');
    }

    const history = await this.prisma.settlementHistory.findMany({
      where: { settlementId },
      orderBy: { createdAt: 'desc' }
    });

    return history.map(entry => ({
      id: entry.id,
      settlementId: entry.settlementId,
      action: entry.action,
      amount: Number(entry.amount),
      currency: entry.currency,
      notes: entry.notes || undefined,
      createdAt: entry.createdAt.toISOString()
    }));
  }
} 