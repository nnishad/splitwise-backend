import { FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/userService';
import { 
  CreateUserRequest, 
  UpdateUserRequest
} from '../types/user';
import { authenticateSupabaseToken } from '../middleware/supabaseAuth';
import {
  createUserSchema,
  updateUserSchema,
  updateCurrentUserSchema,
  deleteUserSchema,
  getUserSchema,
  getCurrentUserSchema,
  getUsersSchema,
  blockUserSchema,
  unblockUserSchema,
} from '../utils/validation';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = new UserService(fastify.prisma);

  // Get current user profile
  fastify.get(
    '/users/me',
    {
      schema: {
        ...getCurrentUserSchema,
        tags: ['users']
      },
      preHandler: authenticateSupabaseToken,
    },
    async (request, reply) => {
      try {
        const result = await userService.getUserById(request.user?.id!);
        
        if (!result.success) {
          return reply.status(404).send(result);
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

  // Update current user profile
  fastify.put(
    '/users/me',
    {
      schema: {
        ...updateCurrentUserSchema,
        tags: ['users']
      },
      preHandler: authenticateSupabaseToken,
    },
    async (request, reply) => {
      try {
        const userData = request.body as UpdateUserRequest;
        const result = await userService.updateUser(request.user?.id!, userData);
        
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

  // Delete current user account
  fastify.delete(
    '/users/me',
    {
      schema: {
        ...deleteUserSchema,
        tags: ['users']
      },
      preHandler: authenticateSupabaseToken,
    },
    async (request, reply) => {
      try {
        const result = await userService.deleteUser(request.user?.id!);
        
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

  // Get user by ID (for group members, etc.)
  fastify.get(
    '/users/:userId',
    {
      schema: {
        ...getUserSchema,
        tags: ['users']
      },
      preHandler: authenticateSupabaseToken,
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const result = await userService.getUserById(userId);
        
        if (!result.success) {
          return reply.status(404).send(result);
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

  // List users (for admin purposes)
  fastify.get(
    '/users',
    {
      schema: {
        ...getUsersSchema,
        tags: ['users']
      },
      preHandler: authenticateSupabaseToken,
    },
    async (request, reply) => {
      try {
        const result = await userService.getAllUsers();
        
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

  // Block a user
  fastify.post(
    '/users/:userId/block',
    {
      schema: {
        ...blockUserSchema,
        tags: ['users']
      },
      preHandler: authenticateSupabaseToken,
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const result = await userService.blockUser(request.user?.id!, userId);
        
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

  // Unblock a user
  fastify.delete(
    '/users/:userId/block',
    {
      schema: {
        ...unblockUserSchema,
        tags: ['users']
      },
      preHandler: authenticateSupabaseToken,
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const result = await userService.unblockUser(request.user?.id!, userId);
        
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

export default userRoutes; 