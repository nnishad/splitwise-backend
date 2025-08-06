import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExpenseService } from '../services/expenseService';
import { authenticateToken } from '../middleware/auth';
import { JWTPayload } from '../utils/auth';
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
  user: JWTPayload;
}

export default async function expenseRoutes(fastify: FastifyInstance) {
  const expenseService = new ExpenseService(fastify.prisma);

  // Create a new expense
  fastify.post('/expenses', {
    schema: {
      tags: ['expenses'],
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
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const data = request.body as CreateExpenseRequest;
      const expense = await expenseService.createExpense(data.groupId, authenticatedRequest.user.userId, data);
      
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
      tags: ['expenses'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const expense = await expenseService.getExpenseById(id, authenticatedRequest.user.userId);
      
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
        tags: ['expenses'],
        
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' 
      }
        },
        required: ['id']
      },
      body: updateExpenseSchema
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const data = request.body as UpdateExpenseRequest;
      const expense = await expenseService.updateExpense(id, authenticatedRequest.user.userId, data);
      
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
        tags: ['expenses'],
        
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' 
      }
        },
        required: ['id']
      }
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      await expenseService.deleteExpense(id, authenticatedRequest.user.userId);
      
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
        tags: ['expenses'],
        
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' 
      }
        },
        required: ['id']
      }
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const expense = await expenseService.restoreExpense(id, authenticatedRequest.user.userId);
      
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
        tags: ['expenses'],
        
      querystring: searchExpensesSchema
    
      },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const filters = request.query as SearchExpensesRequest;
      const result = await expenseService.searchExpenses(authenticatedRequest.user.userId, filters);
      
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
        tags: ['expenses'],
        
      body: {
        type: 'object',
        required: ['expenseIds', 'updates'],
        properties: {
          expenseIds: {
            type: 'array',
            items: { type: 'string' 
      },
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
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const data = request.body as BulkUpdateExpenseRequest;
      await expenseService.bulkUpdateExpenses(authenticatedRequest.user.userId, data);
      
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
        tags: ['expenses'],
        
      body: {
        type: 'object',
        required: ['expenseIds'],
        properties: {
          expenseIds: {
            type: 'array',
            items: { type: 'string' 
      },
            minItems: 1
          }
        }
      }
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const data = request.body as BulkDeleteExpenseRequest;
      await expenseService.bulkDeleteExpenses(authenticatedRequest.user.userId, data);
      
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
      schema: {
        tags: ['expenses']
      },
      
    preHandler: authenticateToken
  
    }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
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
      schema: {
        tags: ['expenses']
      },
      
    preHandler: authenticateToken
  
    }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
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
        tags: ['expenses'],
        
      querystring: {
        type: 'object',
        properties: {
          groupId: { type: 'string' 
      }
        }
      }
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const { groupId } = request.query as { groupId?: string };
      const summary = await expenseService.getExpenseSummary(authenticatedRequest.user.userId, groupId);
      
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
        tags: ['expenses'],
        
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' 
      }
        },
        required: ['id']
      }
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const lastAction = await expenseService.getLastAction(id, authenticatedRequest.user.userId);
      
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
        tags: ['expenses'],
        
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' 
      }
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
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const { content } = request.body as { content: string };
      
      const comment = await fastify.prisma.expenseComment.create({
        data: {
          expenseId: id,
          userId: authenticatedRequest.user.userId,
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
        tags: ['expenses'],
        
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' 
      }
        },
        required: ['id']
      }
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
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
        tags: ['expenses'],
        
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' 
      }
        },
        required: ['id']
      }
    },
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
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