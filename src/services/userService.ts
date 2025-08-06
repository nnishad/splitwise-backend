import { PrismaClient } from '@prisma/client';
import { CreateUserRequest, UpdateUserRequest, User, UserResponse, UsersResponse, UserBlocksResponse } from '../types/user';

export class UserService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
        },
      });

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          return {
            success: false,
            message: 'User with this email already exists',
          };
        }
      }
      throw error;
    }
  }

  async getAllUsers(): Promise<UsersResponse> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: users,
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id: string): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { 
          id,
          isDeleted: false,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id: string, userData: UpdateUserRequest): Promise<UserResponse> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { 
          id,
          isDeleted: false,
        },
      });

      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const user = await this.prisma.user.update({
        where: { id },
        data: userData,
      });

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id: string): Promise<UserResponse> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { 
          id,
          isDeleted: false,
        },
      });

      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Anonymize user data instead of hard delete
      const anonymizedUser = await this.prisma.user.update({
        where: { id },
        data: {
          email: `deleted_${Date.now()}@deleted.com`,
          name: 'Deleted User',
          avatar: null,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Also deactivate all sessions
      await this.prisma.session.updateMany({
        where: { userId: id },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'User deleted and data anonymized successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async blockUser(blockerId: string, blockedId: string): Promise<UserResponse> {
    try {
      // Check if both users exist
      const blocker = await this.prisma.user.findUnique({
        where: { 
          id: blockerId,
          isDeleted: false,
        },
      });

      const blocked = await this.prisma.user.findUnique({
        where: { 
          id: blockedId,
          isDeleted: false,
        },
      });

      if (!blocker || !blocked) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (blockerId === blockedId) {
        return {
          success: false,
          message: 'Cannot block yourself',
        };
      }

      // Check if already blocked
      const existingBlock = await this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
      });

      if (existingBlock) {
        return {
          success: false,
          message: 'User is already blocked',
        };
      }

      // Create block
      await this.prisma.userBlock.create({
        data: {
          blockerId,
          blockedId,
        },
      });

      return {
        success: true,
        message: 'User blocked successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<UserResponse> {
    try {
      const block = await this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
      });

      if (!block) {
        return {
          success: false,
          message: 'User is not blocked',
        };
      }

      await this.prisma.userBlock.delete({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
      });

      return {
        success: true,
        message: 'User unblocked successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async getBlockedUsers(userId: string): Promise<UserBlocksResponse> {
    try {
      const blocks = await this.prisma.userBlock.findMany({
        where: { blockerId: userId },
        include: {
          blocked: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: blocks.map((block: any) => ({
          id: block.id,
          blockerId: block.blockerId,
          blockedId: block.blockedId,
          createdAt: block.createdAt,
          blocker: block.blocker,
          blocked: block.blocked,
        })),
      };
    } catch (error) {
      throw error;
    }
  }

  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      const block = await this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
      });

      return !!block;
    } catch (error) {
      throw error;
    }
  }
} 