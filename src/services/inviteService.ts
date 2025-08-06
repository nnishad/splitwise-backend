import { PrismaClient } from '@prisma/client';
import { 
  CreateInviteRequest, 
  JoinGroupRequest, 
  GroupInvitesResponse, 
  InviteResponse,
  GroupResponse,
  InviteType 
} from '../types/group';
import { AuthUtils } from '../utils/auth';

export class InviteService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createInvite(groupId: string, userId: string, inviteData: CreateInviteRequest): Promise<InviteResponse> {
    try {
      // Check if user has permission to create invites
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return {
          success: false,
          message: 'You do not have permission to create invites for this group',
        };
      }

      // Validate invite type and value
      if (inviteData.inviteType === InviteType.EMAIL) {
        if (!AuthUtils.validateEmail(inviteData.inviteValue)) {
          return {
            success: false,
            message: 'Invalid email address',
          };
        }
      } else if (inviteData.inviteType === InviteType.PHONE) {
        // Basic phone validation (you might want more sophisticated validation)
        if (!inviteData.inviteValue || inviteData.inviteValue.length < 10) {
          return {
            success: false,
            message: 'Invalid phone number',
          };
        }
      }

      // Generate unique invite code
      const inviteCode = AuthUtils.generateResetToken();

      // Set expiration (default 7 days)
      const expiresIn = inviteData.expiresIn || 168; // 7 days in hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);

      // Create invite
      const invite = await this.prisma.groupInvite.create({
        data: {
          groupId,
          invitedById: userId,
          inviteType: inviteData.inviteType,
          inviteValue: inviteData.inviteValue,
          inviteCode,
          expiresAt,
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Generate invite URL
      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${inviteCode}`;

      return {
        success: true,
        data: {
          inviteCode,
          inviteUrl,
          expiresAt: invite.expiresAt,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async joinGroup(userId: string, joinData: JoinGroupRequest): Promise<GroupResponse> {
    try {
      // Find the invite
      const invite = await this.prisma.groupInvite.findUnique({
        where: { inviteCode: joinData.inviteCode },
        include: {
          group: {
            include: {
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
      });

      if (!invite) {
        return {
          success: false,
          message: 'Invalid invite code',
        };
      }

      if (invite.isUsed) {
        return {
          success: false,
          message: 'This invite has already been used',
        };
      }

      if (invite.expiresAt < new Date()) {
        return {
          success: false,
          message: 'This invite has expired',
        };
      }

      // Check if user is already a member
      const existingMembership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: invite.groupId,
            userId,
          },
        },
      });

      if (existingMembership) {
        return {
          success: false,
          message: 'You are already a member of this group',
        };
      }

      // Check group member limit
      if (invite.group.maxMembers && invite.group._count.members >= invite.group.maxMembers) {
        return {
          success: false,
          message: 'Group has reached maximum member limit',
        };
      }

      // Add user to group and mark invite as used
      await this.prisma.$transaction([
        this.prisma.groupMember.create({
          data: {
            groupId: invite.groupId,
            userId,
            role: 'MEMBER',
          },
        }),
        this.prisma.groupInvite.update({
          where: { id: invite.id },
          data: {
            isUsed: true,
            usedAt: new Date(),
            usedBy: userId,
          },
        }),
      ]);

      return {
        success: true,
        message: 'Successfully joined the group',
      };
    } catch (error) {
      throw error;
    }
  }

  async getGroupInvites(groupId: string, userId: string): Promise<GroupInvitesResponse> {
    try {
      // Check if user has permission to view invites
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return {
          success: false,
          message: 'You do not have permission to view invites for this group',
        };
      }

      const invites = await this.prisma.groupInvite.findMany({
        where: { 
          groupId,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: invites.map(invite => ({
          id: invite.id,
          groupId: invite.groupId,
          invitedById: invite.invitedById,
          inviteType: invite.inviteType,
          inviteValue: invite.inviteValue,
          inviteCode: invite.inviteCode,
          expiresAt: invite.expiresAt,
          isUsed: invite.isUsed,
          usedAt: invite.usedAt,
          usedBy: invite.usedBy,
          createdAt: invite.createdAt,
          group: invite.group,
          invitedBy: invite.invitedBy,
        })),
      };
    } catch (error) {
      throw error;
    }
  }

  async revokeInvite(groupId: string, userId: string, inviteId: string): Promise<GroupResponse> {
    try {
      // Check if user has permission to revoke invites
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return {
          success: false,
          message: 'You do not have permission to revoke invites for this group',
        };
      }

      // Check if invite exists and belongs to this group
      const invite = await this.prisma.groupInvite.findFirst({
        where: {
          id: inviteId,
          groupId,
        },
      });

      if (!invite) {
        return {
          success: false,
          message: 'Invite not found',
        };
      }

      // Delete the invite
      await this.prisma.groupInvite.delete({
        where: { id: inviteId },
      });

      return {
        success: true,
        message: 'Invite revoked successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async cleanupExpiredInvites(): Promise<void> {
    try {
      await this.prisma.groupInvite.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }
} 