import { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../services/authService';
import { 
  CreateUserRequest, 
  LoginRequest, 
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  ChangePasswordRequest 
} from '../types/user';
import { authenticateToken } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  passwordResetSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
} from '../utils/validation';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  // Register new user
  fastify.post(
    '/auth/register',
    {
      schema: {
        ...registerSchema,
        tags: ['auth']
      },
    },
    async (request, reply) => {
      try {
        const userData = request.body as CreateUserRequest;
        const result = await authService.register(userData);
        
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

  // Login user
  fastify.post(
    '/auth/login',
    {
      schema: {
        ...loginSchema,
        tags: ['auth']
      },
    },
    async (request, reply) => {
      try {
        const loginData = request.body as LoginRequest;
        const result = await authService.login(loginData);
        
        if (!result.success) {
          return reply.status(401).send(result);
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

  // Request password reset
  fastify.post(
    '/auth/password-reset',
    {
      schema: {
        ...passwordResetSchema,
        tags: ['auth']
      },
    },
    async (request, reply) => {
      try {
        const resetData = request.body as PasswordResetRequest;
        const result = await authService.requestPasswordReset(resetData);
        
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

  // Confirm password reset
  fastify.post(
    '/auth/password-reset/confirm',
    {
      schema: {
        ...passwordResetConfirmSchema,
        tags: ['auth']
      },
    },
    async (request, reply) => {
      try {
        const resetData = request.body as PasswordResetConfirmRequest;
        const result = await authService.resetPassword(resetData);
        
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

  // Change password (authenticated)
  fastify.post(
    '/auth/change-password',
    {
      schema: {
        ...changePasswordSchema,
        tags: ['auth']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const changeData = request.body as ChangePasswordRequest;
        const result = await authService.changePassword(request.user?.userId!, changeData);
        
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

  // Logout current session
  fastify.post(
    '/auth/logout',
    {
      schema: {
        tags: ['auth']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const result = await authService.logout(request.user?.sessionId!);
        
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

  // Logout from all devices
  fastify.post(
    '/auth/logout-all',
    {
      schema: {
        tags: ['auth']
      },
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const result = await authService.logoutAllDevices(request.user?.userId!);
        
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

export default authRoutes; 