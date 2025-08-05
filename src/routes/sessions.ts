import { FastifyPluginAsync } from 'fastify';
import { SessionService } from '../services/sessionService';
import { authenticateToken } from '../middleware/auth';

interface SessionParams {
  sessionId: string;
}

const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  const sessionService = new SessionService(fastify.prisma);

  // Get active sessions for current user
  fastify.get(
    '/sessions',
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const result = await sessionService.getActiveSessions(request.user?.userId!);
        
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

  // Revoke specific session
  fastify.delete(
    '/sessions/:sessionId',
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { sessionId } = request.params as SessionParams;
        const result = await sessionService.revokeSession(sessionId, request.user?.userId!);
        
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

  // Revoke all sessions except current
  fastify.delete(
    '/sessions',
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const result = await sessionService.revokeAllSessions(request.user?.userId!);
        
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

export default sessionRoutes; 