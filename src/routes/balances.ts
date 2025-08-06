import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BalanceService } from '../services/balanceService';
import { SettlementService } from '../services/settlementService';
import { authenticateToken } from '../middleware/auth';
import { JWTPayload } from '../utils/auth';
import { ExchangeRateService } from '../services/exchangeRateService';
import { SettlementType } from '../types/balance';

interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
}

interface GetBalancesRequest {
  Querystring: {
    displayCurrency?: string;
  };
  Params: {
    groupId: string;
  };
}

interface GetUserBalanceRequest {
  Querystring: {
    displayCurrency?: string;
  };
  Params: {
    groupId: string;
    userId: string;
  };
}

interface GetDebtsRequest {
  Querystring: {
    displayCurrency?: string;
  };
  Params: {
    groupId: string;
  };
}

interface CreateSettlementRequest {
  Body: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency: string;
    exchangeRateOverride?: number;
    notes?: string;
  };
  Params: {
    groupId: string;
  };
}

interface UpdateSettlementRequest {
  Body: {
    notes?: string;
  };
  Params: {
    groupId: string;
    settlementId: string;
  };
}

interface GetSettlementHistoryRequest {
  Querystring: {
    page?: number;
    limit?: number;
  };
  Params: {
    groupId: string;
  };
}

interface CreatePartialSettlementRequest {
  Body: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency: string;
    partialAmount: number;
    originalSplitId: string;
    exchangeRateOverride?: number;
    notes?: string;
  };
  Params: {
    groupId: string;
  };
}

interface GetRealTimeBalanceRequest {
  Querystring: {
    includeSettlements?: boolean;
  };
  Params: {
    groupId: string;
  };
}

interface GetSettlementHistoryDetailRequest {
  Params: {
    settlementId: string;
  };
}

export default async function balanceRoutes(fastify: FastifyInstance) {
  const balanceService = new BalanceService(fastify.prisma);
  const exchangeRateService = new ExchangeRateService(fastify.prisma);

  // Get all user balances for a group
  fastify.get<GetBalancesRequest>(
    '/groups/:groupId/balances',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' }
          },
          required: ['groupId']
        },
        querystring: {
          type: 'object',
          properties: {
            displayCurrency: { type: 'string', minLength: 3, maxLength: 3 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    userName: { type: 'string' },
                    balances: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          currency: { type: 'string' },
                          amount: { type: 'number' },
                          displayAmount: { type: 'string' },
                          convertedAmount: { type: 'number' },
                          displayConvertedAmount: { type: 'string' }
                        }
                      }
                    },
                    totalBalance: { type: 'number' },
                    displayCurrency: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId } = request.params;
        const { displayCurrency } = request.query;
        const userId = (request.user as any).id;

        // Verify user is a member of the group
        const groupMember = await fastify.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } }
        });

        if (!groupMember) {
          return reply.status(403).send({
            success: false,
            error: 'You are not a member of this group'
          });
        }

        const balances = await balanceService.getGroupBalances(groupId, { currency: displayCurrency });

        return reply.send({
          success: true,
          data: balances
        });
      } catch (error) {
        console.error('Error getting group balances:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get group balances'
        });
      }
    }
  );

  // Get specific user's balance
  fastify.get<GetUserBalanceRequest>(
    '/groups/:groupId/balances/:userId',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      },
            userId: { type: 'string' }
          },
          required: ['groupId', 'userId']
        },
        querystring: {
          type: 'object',
          properties: {
            displayCurrency: { type: 'string', minLength: 3, maxLength: 3 }
          }
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId, userId: targetUserId } = request.params;
        const { displayCurrency } = request.query;
        const userId = (request.user as any).id;

        // Verify requesting user is a member of the group
        const groupMember = await fastify.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } }
        });

        if (!groupMember) {
          return reply.status(403).send({
            success: false,
            error: 'You are not a member of this group'
          });
        }

        const balances = await balanceService.getGroupBalances(groupId, { currency: displayCurrency });
        const userBalance = balances.balances.find(b => b.userId === targetUserId);

        if (!userBalance) {
          return reply.status(404).send({
            success: false,
            error: 'User balance not found'
          });
        }

        return reply.send({
          success: true,
          data: userBalance
        });
      } catch (error) {
        console.error('Error getting user balance:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get user balance'
        });
      }
    }
  );

  // Get "who owes whom" breakdown
  fastify.get<GetDebtsRequest>(
    '/groups/:groupId/debts',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      }
          },
          required: ['groupId']
        },
        querystring: {
          type: 'object',
          properties: {
            displayCurrency: { type: 'string', minLength: 3, maxLength: 3 }
          }
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId } = request.params;
        const { displayCurrency } = request.query;
        const userId = (request.user as any).id;

        // Verify user is a member of the group
        const groupMember = await fastify.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } }
        });

        if (!groupMember) {
          return reply.status(403).send({
            success: false,
            error: 'You are not a member of this group'
          });
        }

        const debts = await balanceService.getSimplifiedDebts(groupId, displayCurrency);

        return reply.send({
          success: true,
          data: debts
        });
      } catch (error) {
        console.error('Error getting group debts:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get group debts'
        });
      }
    }
  );

  // Create a new settlement
  fastify.post<CreateSettlementRequest>(
    '/groups/:groupId/settlements',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      }
          },
          required: ['groupId']
        },
        body: {
          type: 'object',
          properties: {
            fromUserId: { type: 'string' },
            toUserId: { type: 'string' },
            amount: { type: 'number', minimum: 0.01 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            exchangeRateOverride: { type: 'number', minimum: 0 },
            notes: { type: 'string', maxLength: 500 }
          },
          required: ['fromUserId', 'toUserId', 'amount', 'currency']
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId } = request.params;
        const settlementData = request.body;
        const userId = (request.user as any).id;

        // Validate currency
        if (!exchangeRateService.isValidCurrency(settlementData.currency)) {
          return reply.status(400).send({
            success: false,
            error: `Invalid currency: ${settlementData.currency}`
          });
        }

        const settlement = await balanceService.createSettlement(groupId, settlementData, userId);

        return reply.status(201).send({
          success: true,
          data: settlement
        });
      } catch (error) {
        console.error('Error creating settlement:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create settlement'
        });
      }
    }
  );

  // Get settlement by ID
  fastify.get(
    '/groups/:groupId/settlements/:settlementId',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      },
            settlementId: { type: 'string' }
          },
          required: ['groupId', 'settlementId']
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId, settlementId } = request.params as { groupId: string; settlementId: string };
        const userId = authenticatedRequest.user.userId;

        // Verify user is a member of the group
        const groupMember = await fastify.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } }
        });

        if (!groupMember) {
          return reply.status(403).send({
            success: false,
            error: 'You are not a member of this group'
          });
        }

        const settlement = await fastify.prisma.settlement.findUnique({
          where: { id: settlementId },
          include: {
            fromUser: {
              select: { id: true, name: true }
            },
            toUser: {
              select: { id: true, name: true }
            }
          }
        });

        if (!settlement || settlement.groupId !== groupId) {
          return reply.status(404).send({
            success: false,
            error: 'Settlement not found'
          });
        }

        return reply.send({
          success: true,
          data: settlement
        });
      } catch (error) {
        console.error('Error getting settlement:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get settlement'
        });
      }
    }
  );

  // Update settlement
  fastify.put<UpdateSettlementRequest>(
    '/groups/:groupId/settlements/:settlementId',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      },
            settlementId: { type: 'string' }
          },
          required: ['groupId', 'settlementId']
        },
        body: {
          type: 'object',
          properties: {
            notes: { type: 'string', maxLength: 500 }
          }
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId, settlementId } = request.params as { groupId: string; settlementId: string };
        const { notes } = request.body as { notes?: string };
        const userId = authenticatedRequest.user.userId;

        // Verify user is involved in the settlement
        const settlement = await fastify.prisma.settlement.findUnique({
          where: { id: settlementId }
        });

        if (!settlement || settlement.groupId !== groupId) {
          return reply.status(404).send({
            success: false,
            error: 'Settlement not found'
          });
        }

        if (settlement.fromUserId !== userId && settlement.toUserId !== userId) {
          return reply.status(403).send({
            success: false,
            error: 'You can only update settlements involving yourself'
          });
        }

        const updatedSettlement = await fastify.prisma.settlement.update({
          where: { id: settlementId },
          data: { notes },
          include: {
            fromUser: {
              select: { id: true, name: true }
            },
            toUser: {
              select: { id: true, name: true }
            }
          }
        });

        return reply.send({
          success: true,
          data: updatedSettlement
        });
      } catch (error) {
        console.error('Error updating settlement:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update settlement'
        });
      }
    }
  );

  // Delete settlement
  fastify.delete(
    '/groups/:groupId/settlements/:settlementId',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      },
            settlementId: { type: 'string' }
          },
          required: ['groupId', 'settlementId']
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId, settlementId } = request.params as { groupId: string; settlementId: string };
        const userId = authenticatedRequest.user.userId;

        // Verify user is involved in the settlement
        const settlement = await fastify.prisma.settlement.findUnique({
          where: { id: settlementId }
        });

        if (!settlement || settlement.groupId !== groupId) {
          return reply.status(404).send({
            success: false,
            error: 'Settlement not found'
          });
        }

        if (settlement.fromUserId !== userId && settlement.toUserId !== userId) {
          return reply.status(403).send({
            success: false,
            error: 'You can only delete settlements involving yourself'
          });
        }

        await fastify.prisma.settlement.delete({
          where: { id: settlementId }
        });

        return reply.send({
          success: true,
          message: 'Settlement deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting settlement:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to delete settlement'
        });
      }
    }
  );

  // Get settlement history
  fastify.get<GetSettlementHistoryRequest>(
    '/groups/:groupId/settlements',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      }
          },
          required: ['groupId']
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100 }
          }
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId } = request.params as { groupId: string };
        const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
        const userId = authenticatedRequest.user.userId;

        // Verify user is a member of the group
        const groupMember = await fastify.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } }
        });

        if (!groupMember) {
          return reply.status(403).send({
            success: false,
            error: 'You are not a member of this group'
          });
        }

        const history = await balanceService.getSettlementHistory(groupId, page, limit);

        return reply.send({
          success: true,
          data: history
        });
      } catch (error) {
        console.error('Error getting settlement history:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get settlement history'
        });
      }
    }
  );

  // Complete settlement
  fastify.post(
    '/groups/:groupId/settlements/:settlementId/complete',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      },
            settlementId: { type: 'string' }
          },
          required: ['groupId', 'settlementId']
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId, settlementId } = request.params as { groupId: string; settlementId: string };
        const userId = authenticatedRequest.user.userId;

        const settlement = await balanceService.completeSettlement(settlementId, userId);

        return reply.send({
          success: true,
          data: settlement
        });
      } catch (error) {
        console.error('Error completing settlement:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to complete settlement'
        });
      }
    }
  );

  // Cancel settlement
  fastify.post(
    '/groups/:groupId/settlements/:settlementId/cancel',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      },
            settlementId: { type: 'string' }
          },
          required: ['groupId', 'settlementId']
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId, settlementId } = request.params as { groupId: string; settlementId: string };
        const userId = authenticatedRequest.user.userId;

        const settlement = await balanceService.cancelSettlement(settlementId, userId);

        return reply.send({
          success: true,
          data: settlement
        });
      } catch (error) {
        console.error('Error cancelling settlement:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to cancel settlement'
        });
      }
    }
  );

  // Get real-time balance for a group
  fastify.get<GetRealTimeBalanceRequest>(
    '/groups/:groupId/real-time-balance',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      }
          },
          required: ['groupId']
        },
        querystring: {
          type: 'object',
          properties: {
            includeSettlements: { type: 'boolean' }
          }
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId } = request.params as { groupId: string };
        const userId = authenticatedRequest.user.userId;

        const realTimeBalance = await balanceService.getRealTimeBalance(groupId, userId);

        return reply.send({
          success: true,
          data: realTimeBalance
        });
      } catch (error) {
        console.error('Error getting real-time balance:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get real-time balance'
        });
      }
    }
  );

  // Create partial settlement
  fastify.post<CreatePartialSettlementRequest>(
    '/groups/:groupId/partial-settlements',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            groupId: { type: 'string' 
      }
          },
          required: ['groupId']
        },
        body: {
          type: 'object',
          properties: {
            fromUserId: { type: 'string' },
            toUserId: { type: 'string' },
            amount: { type: 'number', minimum: 0.01 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            partialAmount: { type: 'number', minimum: 0.01 },
            originalSplitId: { type: 'string' },
            exchangeRateOverride: { type: 'number', minimum: 0 },
            notes: { type: 'string', maxLength: 500 }
          },
          required: ['fromUserId', 'toUserId', 'amount', 'currency', 'partialAmount', 'originalSplitId']
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { groupId } = request.params;
        const { fromUserId, toUserId, amount, currency, partialAmount, originalSplitId, exchangeRateOverride, notes } = request.body;
        const userId = (request.user as any).id;

        const settlementData = {
          fromUserId,
          toUserId,
          amount,
          currency,
          partialAmount,
          originalSplitId,
          exchangeRateOverride,
          notes,
          settlementType: SettlementType.PARTIAL
        };

        const settlement = await balanceService.createSettlement(groupId, settlementData, userId);

        return reply.send({
          success: true,
          data: settlement
        });
      } catch (error) {
        console.error('Error creating partial settlement:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create partial settlement'
        });
      }
    }
  );

  // Get settlement history for a specific settlement
  fastify.get<GetSettlementHistoryDetailRequest>(
    '/settlements/:settlementId/history',
    {
      preHandler: authenticateToken,
      schema: {
        tags: ['balances'],
        
        params: {
          type: 'object',
          properties: {
            settlementId: { type: 'string' 
      }
          },
          required: ['settlementId']
        }
      }
    },
    async (request, reply) => {
      try {
      const authenticatedRequest = request as AuthenticatedRequest;
        const { settlementId } = request.params;
        const userId = (request.user as any).id;

        const settlementService = new SettlementService(fastify.prisma);
        const history = await settlementService.getSettlementHistory(settlementId, userId);

        return reply.send({
          success: true,
          data: history
        });
      } catch (error) {
        console.error('Error getting settlement history:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get settlement history'
        });
      }
    }
  );
} 