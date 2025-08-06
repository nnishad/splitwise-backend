import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExpenseTemplateService } from '../services/expenseTemplateService';
import { authenticateUser } from '../middleware/auth';
import { 
  CreateExpenseTemplateRequest, 
  UpdateExpenseTemplateRequest,
  createExpenseTemplateSchema,
  updateExpenseTemplateSchema
} from '../types/expense';

export default async function expenseTemplateRoutes(fastify: FastifyInstance) {
  const expenseTemplateService = new ExpenseTemplateService(fastify.prisma);

  // Create expense template
  fastify.post('/templates', {
    schema: {
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
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ Body: CreateExpenseTemplateRequest }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const template = await expenseTemplateService.createTemplate(userId, request.body);
      return reply.send(template);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Get template by ID
  fastify.get('/templates/:id', {
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const template = await expenseTemplateService.getTemplateById(request.params.id, userId);
      return reply.send(template);
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  });

  // Get all templates for a group
  fastify.get('/groups/:groupId/templates', {
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ Params: { groupId: string } }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const templates = await expenseTemplateService.getTemplatesByGroup(request.params.groupId, userId);
      return reply.send({ templates });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Update template
  fastify.put('/templates/:id', {
    schema: {
      body: updateExpenseTemplateSchema,
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
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ 
    Params: { id: string },
    Body: UpdateExpenseTemplateRequest 
  }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const template = await expenseTemplateService.updateTemplate(request.params.id, userId, request.body);
      return reply.send(template);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Delete template
  fastify.delete('/templates/:id', {
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      await expenseTemplateService.deleteTemplate(request.params.id, userId);
      return reply.send({ message: 'Template deleted successfully' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Create expense from template
  fastify.post('/templates/:id/create-expense', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
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
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ 
    Params: { id: string },
    Body: any 
  }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const expense = await expenseTemplateService.createExpenseFromTemplate(request.params.id, userId, request.body);
      return reply.send(expense);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
} 