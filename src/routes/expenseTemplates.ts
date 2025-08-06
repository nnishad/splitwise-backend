import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExpenseTemplateService } from '../services/expenseTemplateService';
import { authenticateSupabaseToken } from '../middleware/supabaseAuth';

import { 
  CreateExpenseTemplateRequest, 
  UpdateExpenseTemplateRequest,
  createExpenseTemplateSchema,
  updateExpenseTemplateSchema
} from '../types/expense';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    preferredCurrency: string;
  };
}

export default async function expenseTemplateRoutes(fastify: FastifyInstance) {
  const expenseTemplateService = new ExpenseTemplateService(fastify.prisma);

  // Create expense template
  fastify.post('/templates', {
    schema: {
      tags: ['expenseTemplates'],
      body: createExpenseTemplateSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            group: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                defaultCurrency: { type: 'string' }
              }
            },
            createdBy: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' }
              }
            },
            splits: { type: 'array' },
            payers: { type: 'array' },
            tags: { type: 'array' },
            isRecurring: { type: 'boolean' },
            recurringPattern: { type: 'string' },
            nextRecurringDate: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        }
      }
    },
    preHandler: authenticateSupabaseToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const userId = authenticatedRequest.user.id;
      const body = request.body as CreateExpenseTemplateRequest;
      const template = await expenseTemplateService.createTemplate(userId, body);
      return reply.send(template);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Get template by ID
  fastify.get('/templates/:id', {
    schema: {
      tags: ['expenseTemplates']
    },
    preHandler: authenticateSupabaseToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const userId = authenticatedRequest.user.id;
      const { id } = request.params as { id: string };
      const template = await expenseTemplateService.getTemplateById(id, userId);
      return reply.send(template);
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  });

  // Get all templates for a group
  fastify.get('/groups/:groupId/templates', {
    schema: {
      tags: ['expenseTemplates']
    },
    preHandler: authenticateSupabaseToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const userId = authenticatedRequest.user.id;
      const { groupId } = request.params as { groupId: string };
      const templates = await expenseTemplateService.getTemplatesByGroup(groupId, userId);
      return reply.send({ templates });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Update template
  fastify.put('/templates/:id', {
    schema: {
        tags: ['expenseTemplates'],
        
      body: updateExpenseTemplateSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' 
      },
            name: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            group: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                defaultCurrency: { type: 'string' }
              }
            },
            createdBy: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' }
              }
            },
            splits: { type: 'array' },
            payers: { type: 'array' },
            tags: { type: 'array' },
            isRecurring: { type: 'boolean' },
            recurringPattern: { type: 'string' },
            nextRecurringDate: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        }
      }
    },
    preHandler: authenticateSupabaseToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const userId = authenticatedRequest.user.id;
      const { id } = request.params as { id: string };
      const body = request.body as UpdateExpenseTemplateRequest;
      const template = await expenseTemplateService.updateTemplate(id, userId, body);
      return reply.send(template);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Delete template
  fastify.delete('/templates/:id', {
      schema: {
        tags: ['expenseTemplates']
      },
      
    preHandler: authenticateSupabaseToken
  
    }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const userId = authenticatedRequest.user.id;
      const { id } = request.params as { id: string };
      await expenseTemplateService.deleteTemplate(id, userId);
      return reply.send({ message: 'Template deleted successfully' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Create expense from template
  fastify.post('/templates/:id/create-expense', {
    schema: {
        tags: ['expenseTemplates'],
        
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' 
      },
          description: { type: 'string' },
          amount: { type: 'number' },
          categoryId: { type: 'string' },
          splitType: { type: 'string', enum: ['EQUAL', 'PERCENTAGE', 'AMOUNT', 'SHARES'] },
          splits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                amount: { type: 'number' },
                percentage: { type: 'number' },
                shares: { type: 'number' }
              }
            }
          },
          payers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                amount: { type: 'number' }
              }
            }
          },
          tagNames: {
            type: 'array',
            items: { type: 'string' }
          },
          isRecurring: { type: 'boolean' },
          recurringPattern: { type: 'string' },
          nextRecurringDate: { type: 'string' }
        }
      }
    },
    preHandler: authenticateSupabaseToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const userId = authenticatedRequest.user.id;
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const expense = await expenseTemplateService.createExpenseFromTemplate(id, userId, body);
      return reply.send(expense);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
} 