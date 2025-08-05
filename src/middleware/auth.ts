import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthUtils, JWTPayload } from '../utils/auth';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
}

export const authenticateToken = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return reply.status(401).send({
      success: false,
      message: 'Access token is required',
    });
  }

  const decoded = AuthUtils.verifyToken(token);
  if (!decoded) {
    return reply.status(401).send({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  // Verify session is still active in database
  const prisma = (request.server as any).prisma as PrismaClient;
  const session = await prisma.session.findFirst({
    where: {
      id: decoded.sessionId,
      isActive: true,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!session) {
    return reply.status(401).send({
      success: false,
      message: 'Session expired or invalid',
    });
  }

  // Verify user still exists and is not deleted
  const user = await prisma.user.findUnique({
    where: {
      id: decoded.userId,
      isDeleted: false,
    },
  });

  if (!user) {
    return reply.status(401).send({
      success: false,
      message: 'User not found or account deleted',
    });
  }

  request.user = decoded;
};

export const optionalAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return; // Continue without authentication
  }

  const decoded = AuthUtils.verifyToken(token);
  if (!decoded) {
    return; // Continue without authentication
  }

  // Verify session is still active in database
  const prisma = (request.server as any).prisma as PrismaClient;
  const session = await prisma.session.findFirst({
    where: {
      id: decoded.sessionId,
      isActive: true,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!session) {
    return; // Continue without authentication
  }

  // Verify user still exists and is not deleted
  const user = await prisma.user.findUnique({
    where: {
      id: decoded.userId,
      isDeleted: false,
    },
  });

  if (!user) {
    return; // Continue without authentication
  }

  request.user = decoded;
}; 