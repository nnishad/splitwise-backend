import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExpenseService } from '../services/expenseService';
import { authenticateUser } from '../middleware/auth';
import { 
  createExpenseSchema, 
  updateExpenseSchema, 
  searchExpensesSchema,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  SearchExpensesRequest,
  BulkUpdateExpenseRequest,
  BulkDeleteExpenseRequest
} from '../types/expense';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export default async function expenseRoutes(fastify: FastifyInstance) {
  const expenseService = new ExpenseService(fastify.prisma);

  // Create a new expense
  fastify.post('/expenses', {
    schema: {
      body: createExpenseSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string' },
                date: { type: 'string' },
                group: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                  }
                },
                createdBy: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const data = request.body as CreateExpenseRequest;
      const expense = await expenseService.createExpense(request.user.id, data);
      
      reply.code(201).send({
        success: true,
        data: expense
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get expense by ID
  fastify.get('/expenses/:id', {
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
      const expense = await expenseService.getExpenseById(id, request.user.id);
      
      reply.send({
        success: true,
        data: expense
      });
    } catch (error: any) {
      reply.code(404).send({
        success: false,
        message: error.message
      });
    }
  });

  // Update expense
  fastify.put('/expenses/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: updateExpenseSchema
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as UpdateExpenseRequest;
      const expense = await expenseService.updateExpense(id, request.user.id, data);
      
      reply.send({
        success: true,
        data: expense
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Delete expense (archive)
  fastify.delete('/expenses/:id', {
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
      await expenseService.deleteExpense(id, request.user.id);
      
      reply.send({
        success: true,
        message: 'Expense archived successfully'
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Restore archived expense
  fastify.post('/expenses/:id/restore', {
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
      const expense = await expenseService.restoreExpense(id, request.user.id);
      
      reply.send({
        success: true,
        data: expense
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Search and filter expenses
  fastify.get('/expenses', {
    schema: {
      querystring: searchExpensesSchema
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const filters = request.query as SearchExpensesRequest;
      const result = await expenseService.searchExpenses(request.user.id, filters);
      
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

  // Bulk update expenses
  fastify.patch('/expenses/bulk', {
    schema: {
      body: {
        type: 'object',
        required: ['expenseIds', 'updates'],
        properties: {
          expenseIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          },
          updates: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              categoryId: { type: 'string' },
              isArchived: { type: 'boolean' }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const data = request.body as BulkUpdateExpenseRequest;
      await expenseService.bulkUpdateExpenses(request.user.id, data);
      
      reply.send({
        success: true,
        message: 'Expenses updated successfully'
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Bulk delete expenses
  fastify.delete('/expenses/bulk', {
    schema: {
      body: {
        type: 'object',
        required: ['expenseIds'],
        properties: {
          expenseIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const data = request.body as BulkDeleteExpenseRequest;
      await expenseService.bulkDeleteExpenses(request.user.id, data);
      
      reply.send({
        success: true,
        message: 'Expenses archived successfully'
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get categories
  fastify.get('/expenses/categories', {
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const categories = await expenseService.getCategories();
      
      reply.send({
        success: true,
        data: categories
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get tags
  fastify.get('/expenses/tags', {
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const tags = await expenseService.getTags();
      
      reply.send({
        success: true,
        data: tags
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get expense summary/statistics
  fastify.get('/expenses/summary', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          groupId: { type: 'string' }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { groupId } = request.query as { groupId?: string };
      const summary = await expenseService.getExpenseSummary(request.user.id, groupId);
      
      reply.send({
        success: true,
        data: summary
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get last action for undo functionality
  fastify.get('/expenses/:id/last-action', {
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
      const lastAction = await expenseService.getLastAction(id, request.user.id);
      
      reply.send({
        success: true,
        data: lastAction
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Add comment to expense
  fastify.post('/expenses/:id/comments', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', maxLength: 500 }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { content } = request.body as { content: string };
      
      const comment = await fastify.prisma.expenseComment.create({
        data: {
          expenseId: id,
          userId: request.user.id,
          content
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          }
        }
      });
      
      reply.code(201).send({
        success: true,
        data: comment
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get expense comments
  fastify.get('/expenses/:id/comments', {
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
      
      const comments = await fastify.prisma.expenseComment.findMany({
        where: { expenseId: id },
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      reply.send({
        success: true,
        data: comments
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get expense history
  fastify.get('/expenses/:id/history', {
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
      
      const history = await fastify.prisma.expenseHistory.findMany({
        where: { expenseId: id },
        include: {
          user: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      reply.send({
        success: true,
        data: history
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
} 