import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase, getSupabaseUser, createAuthAuditLog } from '../utils/supabase';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      avatar?: string;
      preferredCurrency: string;
    };
  }
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    preferredCurrency: string;
  };
}

export const authenticateSupabaseToken = async (
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

  try {
    // Verify token with Supabase (includes auto-refresh)
    const user = await getSupabaseUser(token);
    
    if (!user) {
      return reply.status(401).send({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Get user details from our database
    const prisma = (request.server as any).prisma as PrismaClient;
    const dbUser = await prisma.user.findUnique({
      where: {
        id: user.id,
        isDeleted: false,
      },
    });

    if (!dbUser) {
      return reply.status(401).send({
        success: false,
        message: 'User not found or account deleted',
      });
    }

    // Set user info on request
    request.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar || undefined,
      preferredCurrency: dbUser.preferredCurrency,
    };

    // Log successful authentication
    await createAuthAuditLog({
      action: 'login_success',
      userId: user.id,
      metadata: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        endpoint: request.url
      }
    });

  } catch (error) {
    console.error('Supabase auth error:', error);
    
    // Log failed authentication
    if (request.headers.authorization) {
      try {
        const token = request.headers.authorization.split(' ')[1];
        const user = await getSupabaseUser(token);
        if (user) {
          await createAuthAuditLog({
            action: 'login_failed',
            userId: user.id,
            metadata: {
              ip: request.ip,
              userAgent: request.headers['user-agent'],
              endpoint: request.url,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      } catch (auditError) {
        console.error('Failed to log auth audit:', auditError);
      }
    }

    return reply.status(401).send({
      success: false,
      message: 'Authentication failed',
    });
  }
};

export const optionalSupabaseAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return; // Continue without authentication
  }

  try {
    // Verify token with Supabase (includes auto-refresh)
    const user = await getSupabaseUser(token);
    
    if (!user) {
      return; // Continue without authentication
    }

    // Get user details from our database
    const prisma = (request.server as any).prisma as PrismaClient;
    const dbUser = await prisma.user.findUnique({
      where: {
        id: user.id,
        isDeleted: false,
      },
    });

    if (!dbUser) {
      return; // Continue without authentication
    }

    // Set user info on request
    request.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar || undefined,
      preferredCurrency: dbUser.preferredCurrency,
    };

  } catch (error) {
    console.error('Supabase auth error:', error);
    return; // Continue without authentication
  }
};

// Helper function to get current user from request
export const getCurrentUser = (request: FastifyRequest) => {
  return request.user;
};

// Helper function to check if user is authenticated
export const isAuthenticated = (request: FastifyRequest): request is AuthenticatedRequest => {
  return !!request.user;
}; 