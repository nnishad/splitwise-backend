import { PrismaClient } from '@prisma/client';
import { SessionsResponse, UserResponse } from '../types/user';

export class SessionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getActiveSessions(userId: string): Promise<SessionsResponse> {
    try {
      const sessions = await this.prisma.session.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: sessions.map(session => ({
          id: session.id,
          userId: session.userId,
          token: session.token,
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          isActive: session.isActive,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })),
      };
    } catch (error) {
      throw error;
    }
  }

  async revokeSession(sessionId: string, userId: string): Promise<UserResponse> {
    try {
      const session = await this.prisma.session.findFirst({
        where: {
          id: sessionId,
          userId,
        },
      });

      if (!session) {
        return {
          success: false,
          message: 'Session not found',
        };
      }

      await this.prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'Session revoked successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async revokeAllSessions(userId: string): Promise<UserResponse> {
    try {
      await this.prisma.session.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'All sessions revoked successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.prisma.session.updateMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
        data: { isActive: false },
      });
    } catch (error) {
      throw error;
    }
  }
} 