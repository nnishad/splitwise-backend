import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from '../services/auditService';
import { AuditExportService } from '../services/auditExportService';
import { AuditVisualizationService } from '../services/auditVisualizationService';
import { authenticateUser } from '../middleware/auth';
import {
  getAuditHistorySchema,
  revertExpenseSchema,
  exportRequestSchema,
  GetAuditHistoryRequest,
  RevertExpenseRequest,
  ExportRequest,
  VisualizationRequest,
  SpendingSummaryRequest,
  TransactionHistoryRequest
} from '../types/audit';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export default async function auditRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);
  const auditExportService = new AuditExportService(fastify.prisma);
  const auditVisualizationService = new AuditVisualizationService(fastify.prisma);

  // Get audit history with filtering and pagination
  fastify.get('/audit/history', {
    schema: getAuditHistorySchema,
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const query = request.query as GetAuditHistoryRequest;
      const result = await auditService.getAuditHistory(query, request.user.id);
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get expense audit trail
  fastify.get('/audit/expenses/:id/history', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
      
      const result = await auditService.getExpenseVersions(
        { expenseId: id, page, limit },
        request.user.id
      );
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get group audit trail
  fastify.get('/audit/groups/:id/history', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
      
      const result = await auditService.getAuditHistory(
        { groupId: id, page, limit },
        request.user.id
      );
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Revert expense to previous version
  fastify.post('/audit/expenses/:id/revert/:versionId', {
    schema: revertExpenseSchema,
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id, versionId } = request.params as { id: string; versionId: string };
      const { reason } = request.body as RevertExpenseRequest;
      
      const result = await auditService.revertExpense(id, versionId, request.user.id, reason);
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get all versions of an expense
  fastify.get('/audit/expenses/:id/versions', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
      
      const result = await auditService.getExpenseVersions(
        { expenseId: id, page, limit },
        request.user.id
      );
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get transaction history with filters
  fastify.get('/audit/reports/transactions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          userId: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          categoryId: { type: 'string' },
          minAmount: { type: 'number' },
          maxAmount: { type: 'number' },
          currency: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const query = request.query as TransactionHistoryRequest;
      
      // Convert to audit history request
      const auditRequest: GetAuditHistoryRequest = {
        entityType: 'expense',
        groupId: query.groupId,
        userId: query.userId,
        startDate: query.startDate,
        endDate: query.endDate,
        page: query.page,
        limit: query.limit
      };
      
      const result = await auditService.getAuditHistory(auditRequest, request.user.id);
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get spending summaries
  fastify.get('/audit/reports/summaries', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          userId: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          period: { 
            type: 'string', 
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            default: 'monthly'
          }
        },
        required: ['period']
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const query = request.query as SpendingSummaryRequest;
      
      const result = await auditVisualizationService.getSpendingSummary(query, request.user.id);
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get visualization data
  fastify.get('/audit/reports/visualizations', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          userId: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          chartType: { 
            type: 'string', 
            enum: ['pie', 'bar', 'line', 'heatmap'],
            default: 'pie'
          },
          breakdownBy: { 
            type: 'string', 
            enum: ['category', 'user', 'time', 'currency'],
            default: 'category'
          },
          period: { 
            type: 'string', 
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            default: 'monthly'
          }
        },
        required: ['chartType', 'breakdownBy']
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const query = request.query as VisualizationRequest;
      
      const result = await auditVisualizationService.generateVisualization(query, request.user.id);
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Create export job
  fastify.post('/audit/exports', {
    schema: exportRequestSchema,
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const body = request.body as ExportRequest;
      
      const result = await auditExportService.createExport(request.user.id, body);
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get export status
  fastify.get('/audit/exports/:id/status', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const result = await auditExportService.getExportStatus(id, request.user.id);
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get audit statistics for a group
  fastify.get('/audit/groups/:id/statistics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const result = await auditService.getAuditStatistics(id, request.user.id);
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Archive old audit logs (admin endpoint)
  fastify.post('/audit/archive', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                archivedCount: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      // TODO: Add admin check
      const archivedCount = await auditService.archiveOldLogs();
      
      reply.send({
        success: true,
        data: {
          archivedCount
        }
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Clean up expired exports (admin endpoint)
  fastify.post('/audit/exports/cleanup', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                deletedCount: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      // TODO: Add admin check
      const deletedCount = await auditExportService.cleanupExpiredExports();
      
      reply.send({
        success: true,
        data: {
          deletedCount
        }
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
} 