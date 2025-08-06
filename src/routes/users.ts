import { FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/userService';
import { UpdateUserRequest } from '../types/user';
import { authenticateToken } from '../middleware/auth';
import {
  updateUserSchema,
  getUserSchema,
  getUsersSchema,
  deleteUserSchema,
  blockUserSchema,
  unblockUserSchema,
  getBlockedUsersSchema,
} from '../utils/validation';

interface UserParams {
  id: string;
}

interface BlockUserParams {
  userId: string;
}

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = new UserService(fastify.prisma);

  // Get all users (authenticated)
  fastify.get(
    '/users',
    {
      schema: {
        ...getUsersSchema,
        tags: ['users']
      },
      preHandler: authenticateToken,
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

  // Get user by ID (authenticated)
  fastify.get(
    '/users/:id',
    {
      schema: {
        ...getUserSchema,
        tags: ['users']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as UserParams;
        const result = await userService.getUserById(id);
        
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

  // Update user profile (authenticated)
  fastify.put(
    '/users/:id',
    {
      schema: {
        ...updateUserSchema,
        tags: ['users']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as UserParams;
        
        // Users can only update their own profile
        if (id !== request.user?.userId) {
          return reply.status(403).send({
            success: false,
            message: 'You can only update your own profile',
          });
        }
        
        const userData = request.body as UpdateUserRequest;
        const result = await userService.updateUser(id, userData);
        
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

  // Delete user account (authenticated)
  fastify.delete(
    '/users/:id',
    {
      schema: {
        ...deleteUserSchema,
        tags: ['users']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as UserParams;
        
        // Users can only delete their own account
        if (id !== request.user?.userId) {
          return reply.status(403).send({
            success: false,
            message: 'You can only delete your own account',
          });
        }
        
        const result = await userService.deleteUser(id);
        
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

  // Block user
  fastify.post(
    '/users/:userId/block',
    {
      schema: {
        ...blockUserSchema,
        tags: ['users']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as BlockUserParams;
        const result = await userService.blockUser(request.user?.userId!, userId);
        
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

  // Unblock user
  fastify.delete(
    '/users/:userId/block',
    {
      schema: {
        ...unblockUserSchema,
        tags: ['users']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as BlockUserParams;
        const result = await userService.unblockUser(request.user?.userId!, userId);
        
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

  // Get blocked users
  fastify.get(
    '/users/blocked',
    {
      schema: {
        ...getBlockedUsersSchema,
        tags: ['users']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const result = await userService.getBlockedUsers(request.user?.userId!);
        
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