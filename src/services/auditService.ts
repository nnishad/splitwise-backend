import { PrismaClient } from '@prisma/client';
import { 
  AuditAction, 
  EntityType, 
  AuditLogEntry, 
  GetAuditHistoryRequest,
  GetAuditHistoryResponse,
  GetExpenseVersionsRequest,
  GetExpenseVersionsResponse
} from '../types/audit';
import { compressData, decompressData } from '../utils/compression';

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log an audit entry for any entity change
   */
  async logAuditEntry(
    entityType: EntityType,
    entityId: string,
    action: AuditAction,
    userId: string,
    groupId?: string,
    oldData?: any,
    newData?: any,
    metadata?: any
  ): Promise<void> {
    try {
      // Get current version for optimistic locking
      const currentVersion = await this.getCurrentVersion(entityType, entityId);
      const nextVersion = currentVersion + 1;

      // Compress data to save storage space
      const compressedOldData = oldData ? await compressData(oldData) : null;
      const compressedNewData = newData ? await compressData(newData) : null;

      await this.prisma.auditLog.create({
        data: {
          entityType,
          entityId,
          action,
          userId,
          groupId,
          oldData: compressedOldData,
          newData: compressedNewData,
          metadata: metadata || {},
          version: nextVersion
        }
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      throw new Error('Failed to log audit entry');
    }
  }

  /**
   * Get audit history with filtering and pagination
   */
  async getAuditHistory(
    request: GetAuditHistoryRequest,
    currentUserId: string
  ): Promise<GetAuditHistoryResponse> {
    const {
      entityType,
      entityId,
      groupId,
      userId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = request;

    // Build where clause
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Group filtering with permission check
    if (groupId) {
      // Verify user has access to this group
      const groupMember = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: currentUserId
          }
        }
      });

      if (!groupMember) {
        throw new Error('Access denied: User not a member of this group');
      }

      where.groupId = groupId;
    } else {
      // If no specific group, only show logs from groups user is a member of
      const userGroups = await this.prisma.groupMember.findMany({
        where: { userId: currentUserId },
        select: { groupId: true }
      });

      const groupIds = userGroups.map(gm => gm.groupId);
      if (groupIds.length > 0) {
        where.groupId = { in: groupIds };
      } else {
        // User has no groups, return empty result
        return {
          success: true,
          data: {
            logs: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0
            }
          }
        };
      }
    }

    // Get total count
    const total = await this.prisma.auditLog.count({ where });

    // Get paginated results
    const skip = (page - 1) * limit;
    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Decompress and format audit logs
    const formattedLogs: AuditLogEntry[] = await Promise.all(
      logs.map(async (log) => ({
        id: log.id,
        entityType: log.entityType as EntityType,
        entityId: log.entityId,
        action: log.action as AuditAction,
        userId: log.userId,
        userName: log.user.name,
        groupId: log.groupId || undefined,
        groupName: log.group?.name,
        oldData: log.oldData ? await decompressData(log.oldData) : undefined,
        newData: log.newData ? await decompressData(log.newData) : undefined,
        metadata: log.metadata,
        version: log.version,
        createdAt: log.createdAt.toISOString()
      }))
    );

    return {
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  /**
   * Get all versions of a specific expense
   */
  async getExpenseVersions(
    request: GetExpenseVersionsRequest,
    currentUserId: string
  ): Promise<GetExpenseVersionsResponse> {
    const { expenseId, page = 1, limit = 20 } = request;

    // Verify user has access to this expense
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: {
          include: {
            members: {
              where: { userId: currentUserId }
            }
          }
        }
      }
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.group.members.length === 0) {
      throw new Error('Access denied: User not a member of this group');
    }

    // Get audit logs for this expense
    const where = {
      entityType: EntityType.EXPENSE,
      entityId: expenseId
    };

    const total = await this.prisma.auditLog.count({ where });

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const formattedLogs: AuditLogEntry[] = await Promise.all(
      logs.map(async (log) => ({
        id: log.id,
        entityType: log.entityType as EntityType,
        entityId: log.entityId,
        action: log.action as AuditAction,
        userId: log.userId,
        userName: log.user.name,
        groupId: log.groupId || undefined,
        groupName: expense.group.name,
        oldData: log.oldData ? await decompressData(log.oldData) : undefined,
        newData: log.newData ? await decompressData(log.newData) : undefined,
        metadata: log.metadata,
        version: log.version,
        createdAt: log.createdAt.toISOString()
      }))
    );

    return {
      success: true,
      data: {
        versions: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  /**
   * Revert an expense to a previous version
   */
  async revertExpense(
    expenseId: string,
    versionId: string,
    currentUserId: string,
    reason?: string
  ): Promise<any> {
    // Verify user is the expense creator
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: {
          include: {
            members: {
              where: { userId: currentUserId }
            }
          }
        }
      }
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.createdById !== currentUserId) {
      throw new Error('Only the expense creator can revert changes');
    }

    if (expense.group.members.length === 0) {
      throw new Error('Access denied: User not a member of this group');
    }

    // Get the version to revert to
    const versionLog = await this.prisma.auditLog.findUnique({
      where: { id: versionId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!versionLog || versionLog.entityId !== expenseId) {
      throw new Error('Version not found');
    }

    // Get the data to revert to
    const revertData = versionLog.newData ? await decompressData(versionLog.newData) : null;
    if (!revertData) {
      throw new Error('No data available for this version');
    }

    // Start transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update the expense with the old data
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          title: revertData.title,
          description: revertData.description,
          amount: revertData.amount,
          currency: revertData.currency,
          exchangeRate: revertData.exchangeRate,
          originalCurrency: revertData.originalCurrency,
          convertedAmount: revertData.convertedAmount,
          date: new Date(revertData.date),
          location: revertData.location,
          categoryId: revertData.categoryId,
          updatedAt: new Date()
        },
        include: {
          group: true,
          createdBy: true,
          category: true,
          splits: {
            include: {
              user: true
            }
          },
          payers: {
            include: {
              user: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      // Log the revert action
      await this.logAuditEntry(
        EntityType.EXPENSE,
        expenseId,
        AuditAction.REVERTED,
        currentUserId,
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
          categoryId: expense.categoryId
        },
        revertData,
        { reason, revertedFromVersion: versionId }
      );

      return updatedExpense;
    });

    return {
      expense: result,
      revertedFrom: {
        id: versionLog.id,
        entityType: versionLog.entityType as EntityType,
        entityId: versionLog.entityId,
        action: versionLog.action as AuditAction,
        userId: versionLog.userId,
        userName: versionLog.user.name,
        version: versionLog.version,
        createdAt: versionLog.createdAt.toISOString()
      }
    };
  }

  /**
   * Get current version number for optimistic locking
   */
  private async getCurrentVersion(entityType: EntityType, entityId: string): Promise<number> {
    const latestLog = await this.prisma.auditLog.findFirst({
      where: {
        entityType,
        entityId
      },
      orderBy: { version: 'desc' },
      select: { version: true }
    });

    return latestLog?.version || 0;
  }

  /**
   * Archive old audit logs (older than 1 year)
   */
  async archiveOldLogs(): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const oldLogs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          lt: oneYearAgo
        }
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        userId: true,
        groupId: true,
        oldData: true,
        newData: true,
        metadata: true,
        version: true,
        createdAt: true
      }
    });

    if (oldLogs.length === 0) {
      return 0;
    }

    // Create archive entries
    const archiveEntries = oldLogs.map(log => ({
      originalId: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      userId: log.userId,
      groupId: log.groupId,
      compressedData: {
        oldData: log.oldData,
        newData: log.newData,
        metadata: log.metadata,
        version: log.version,
        createdAt: log.createdAt
      }
    }));

    await this.prisma.$transaction(async (tx) => {
      // Insert archive entries
      await tx.auditArchive.createMany({
        data: archiveEntries
      });

      // Delete old logs
      await tx.auditLog.deleteMany({
        where: {
          id: {
            in: oldLogs.map(log => log.id)
          }
        }
      });
    });

    return oldLogs.length;
  }

  /**
   * Get audit statistics for a group
   */
  async getAuditStatistics(groupId: string, userId: string): Promise<any> {
    // Verify user has access to this group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    if (!groupMember) {
      throw new Error('Access denied: User not a member of this group');
    }

    const [
      totalLogs,
      todayLogs,
      thisWeekLogs,
      thisMonthLogs,
      actionBreakdown,
      userBreakdown
    ] = await Promise.all([
      // Total logs
      this.prisma.auditLog.count({
        where: { groupId }
      }),

      // Today's logs
      this.prisma.auditLog.count({
        where: {
          groupId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),

      // This week's logs
      this.prisma.auditLog.count({
        where: {
          groupId,
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      }),

      // This month's logs
      this.prisma.auditLog.count({
        where: {
          groupId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),

      // Action breakdown
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { groupId },
        _count: {
          action: true
        }
      }),

      // User breakdown
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { groupId },
        _count: {
          userId: true
        }
      })
    ]);

    return {
      totalLogs,
      todayLogs,
      thisWeekLogs,
      thisMonthLogs,
      actionBreakdown: actionBreakdown.map(item => ({
        action: item.action,
        count: item._count.action
      })),
      userBreakdown: userBreakdown.map(item => ({
        userId: item.userId,
        count: item._count.userId
      }))
    };
  }
} 