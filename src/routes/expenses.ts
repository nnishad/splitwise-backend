import { FastifyPluginAsync } from 'fastify';
import { ExpenseService } from '../services/expenseService';
import { 
  CreateExpenseRequest, 
  UpdateExpenseRequest,
  DeleteExpenseRequest,
  GetExpenseRequest,
  ListExpensesRequest,
  AddExpenseSplitRequest,
  UpdateExpenseSplitRequest,
  RemoveExpenseSplitRequest,
  AddExpensePayerRequest,
  UpdateExpensePayerRequest,
  RemoveExpensePayerRequest,
  AddExpenseCommentRequest,
  UpdateExpenseCommentRequest,
  DeleteExpenseCommentRequest,
  AddExpenseTagRequest,
  RemoveExpenseTagRequest,
  ArchiveExpenseRequest,
  RestoreExpenseRequest
} from '../types/expense';
import { authenticateSupabaseToken } from '../middleware/supabaseAuth';
import {
  createExpenseSchema,
  updateExpenseSchema,
  deleteExpenseSchema,
  getExpenseSchema,
  listExpensesSchema,
  addExpenseSplitSchema,
  updateExpenseSplitSchema,
  removeExpenseSplitSchema,
  addExpensePayerSchema,
  updateExpensePayerSchema,
  removeExpensePayerSchema,
  addExpenseCommentSchema,
  updateExpenseCommentSchema,
  deleteExpenseCommentSchema,
  addExpenseTagSchema,
  removeExpenseTagSchema,
  archiveExpenseSchema,
  restoreExpenseSchema,
} from '../utils/validation';

const expenseRoutes: FastifyPluginAsync = async (fastify) => {
  const expenseService = new ExpenseService(fastify.prisma);



  // Create new expense
  fastify.post(
    '/groups/:groupId/expenses',
    {
      schema: {
        ...createExpenseSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as { groupId: string };
        const expenseData = request.body as CreateExpenseRequest;
        const result = await expenseService.createExpense(groupId, request.user?.id!, expenseData);
        
        return reply.status(201).send({
          success: true,
          data: result
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Get expense by ID
  fastify.get(
    '/expenses/:expenseId',
    {
      schema: {
        ...getExpenseSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const result = await expenseService.getExpenseById(expenseId, request.user?.id!);
        
        return reply.send({
          success: true,
          data: result
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Update expense
  fastify.put(
    '/expenses/:expenseId',
    {
      schema: {
        ...updateExpenseSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const expenseData = request.body as UpdateExpenseRequest;
        const result = await expenseService.updateExpense(request.user?.id!, expenseId, expenseData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Delete expense
  fastify.delete(
    '/expenses/:expenseId',
    {
      schema: {
        ...deleteExpenseSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const result = await expenseService.deleteExpense(request.user?.id!, expenseId);
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // List expenses for a group
  fastify.get(
    '/groups/:groupId/expenses',
    {
      schema: {
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as { groupId: string };
        const result = await expenseService.getExpensesByGroup(groupId, request.user?.id!);
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Add expense split
  fastify.post(
    '/expenses/:expenseId/splits',
    {
      schema: {
        ...addExpenseSplitSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const splitData = request.body as AddExpenseSplitRequest;
        const result = await expenseService.addExpenseSplit(request.user?.id!, expenseId, splitData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.status(201).send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Update expense split
  fastify.put(
    '/expenses/:expenseId/splits/:userId',
    {
      schema: {
        ...updateExpenseSplitSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId, userId } = request.params as { expenseId: string; userId: string };
        const splitData = request.body as UpdateExpenseSplitRequest;
        const result = await expenseService.updateExpenseSplit(request.user?.id!, expenseId, userId, splitData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Remove expense split
  fastify.delete(
    '/expenses/:expenseId/splits/:userId',
    {
      schema: {
        ...removeExpenseSplitSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId, userId } = request.params as { expenseId: string; userId: string };
        const result = await expenseService.removeExpenseSplit(request.user?.id!, expenseId, userId);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Add expense payer
  fastify.post(
    '/expenses/:expenseId/payers',
    {
      schema: {
        ...addExpensePayerSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const payerData = request.body as AddExpensePayerRequest;
        const result = await expenseService.addExpensePayer(request.user?.id!, expenseId, payerData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.status(201).send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Update expense payer
  fastify.put(
    '/expenses/:expenseId/payers/:userId',
    {
      schema: {
        ...updateExpensePayerSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId, userId } = request.params as { expenseId: string; userId: string };
        const payerData = request.body as UpdateExpensePayerRequest;
        const result = await expenseService.updateExpensePayer(request.user?.id!, expenseId, userId, payerData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Remove expense payer
  fastify.delete(
    '/expenses/:expenseId/payers/:userId',
    {
      schema: {
        ...removeExpensePayerSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId, userId } = request.params as { expenseId: string; userId: string };
        const result = await expenseService.removeExpensePayer(request.user?.id!, expenseId, userId);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Add expense comment
  fastify.post(
    '/expenses/:expenseId/comments',
    {
      schema: {
        ...addExpenseCommentSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const commentData = request.body as AddExpenseCommentRequest;
        const result = await expenseService.addExpenseComment(request.user?.id!, expenseId, commentData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.status(201).send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Update expense comment
  fastify.put(
    '/expenses/:expenseId/comments/:commentId',
    {
      schema: {
        ...updateExpenseCommentSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId, commentId } = request.params as { expenseId: string; commentId: string };
        const commentData = request.body as UpdateExpenseCommentRequest;
        const result = await expenseService.updateExpenseComment(request.user?.id!, expenseId, commentId, commentData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Delete expense comment
  fastify.delete(
    '/expenses/:expenseId/comments/:commentId',
    {
      schema: {
        ...deleteExpenseCommentSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId, commentId } = request.params as { expenseId: string; commentId: string };
        const result = await expenseService.deleteExpenseComment(request.user?.id!, expenseId, commentId);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Add expense tag
  fastify.post(
    '/expenses/:expenseId/tags',
    {
      schema: {
        ...addExpenseTagSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const tagData = request.body as AddExpenseTagRequest;
        const result = await expenseService.addExpenseTag(request.user?.id!, expenseId, tagData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.status(201).send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Remove expense tag
  fastify.delete(
    '/expenses/:expenseId/tags/:tagId',
    {
      schema: {
        ...removeExpenseTagSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId, tagId } = request.params as { expenseId: string; tagId: string };
        const result = await expenseService.removeExpenseTag(request.user?.id!, expenseId, tagId);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Archive expense
  fastify.post(
    '/expenses/:expenseId/archive',
    {
      schema: {
        ...archiveExpenseSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const archiveData = request.body as ArchiveExpenseRequest;
        const result = await expenseService.archiveExpense(request.user?.id!, expenseId, archiveData);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  // Restore expense
  fastify.post(
    '/expenses/:expenseId/restore',
    {
      schema: {
        ...restoreExpenseSchema,
        tags: ['expenses']
      },
      preHandler: authenticateSupabaseToken
    },
    async (request, reply) => {
      try {
        const { expenseId } = request.params as { expenseId: string };
        const result = await expenseService.restoreExpense(request.user?.id!, expenseId);
        
        if (!result.success) {
          return reply.status(400).send(result);
        }
        
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );
};

export default expenseRoutes; 