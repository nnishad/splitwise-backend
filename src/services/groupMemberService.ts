import { PrismaClient } from '@prisma/client';
import { GroupRole, GroupMembersResponse, GroupResponse } from '../types/group';

export class GroupMemberService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async addMember(groupId: string, userId: string, targetUserId: string, role: GroupRole = GroupRole.MEMBER): Promise<GroupResponse> {
    try {
      // Check if user has permission to add members
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership || (membership.role !== GroupRole.OWNER && membership.role !== GroupRole.ADMIN)) {
        return {
          success: false,
          message: 'You do not have permission to add members to this group',
        };
      }

      // Check if target user is already a member
      const existingMembership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      });

      if (existingMembership) {
        return {
          success: false,
          message: 'User is already a member of this group',
        };
      }

      // Check group member limit
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!group) {
        return {
          success: false,
          message: 'Group not found',
        };
      }

      if (group.maxMembers && group._count.members >= group.maxMembers) {
        return {
          success: false,
          message: 'Group has reached maximum member limit',
        };
      }

      // Add member
      await this.prisma.groupMember.create({
        data: {
          groupId,
          userId: targetUserId,
          role,
        },
      });

      return {
        success: true,
        message: 'Member added successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async removeMember(groupId: string, userId: string, targetUserId: string): Promise<GroupResponse> {
    try {
      // Check if user has permission to remove members
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership || (membership.role !== GroupRole.OWNER && membership.role !== GroupRole.ADMIN)) {
        return {
          success: false,
          message: 'You do not have permission to remove members from this group',
        };
      }

      // Check if target user is a member
      const targetMembership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      });

      if (!targetMembership) {
        return {
          success: false,
          message: 'User is not a member of this group',
        };
      }

      // Prevent removing the last owner
      if (targetMembership.role === GroupRole.OWNER) {
        const ownerCount = await this.prisma.groupMember.count({
          where: {
            groupId,
            role: GroupRole.OWNER,
          },
        });

        if (ownerCount <= 1) {
          return {
            success: false,
            message: 'Cannot remove the last owner. Transfer ownership first.',
          };
        }
      }

      // Remove member
      await this.prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      });

      return {
        success: true,
        message: 'Member removed successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async changeMemberRole(groupId: string, userId: string, targetUserId: string, newRole: GroupRole): Promise<GroupResponse> {
    try {
      // Check if user has permission to change roles
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership || membership.role !== GroupRole.OWNER) {
        return {
          success: false,
          message: 'Only the group owner can change member roles',
        };
      }

      // Check if target user is a member
      const targetMembership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      });

      if (!targetMembership) {
        return {
          success: false,
          message: 'User is not a member of this group',
        };
      }

      // Prevent demoting the last owner
      if (targetMembership.role === GroupRole.OWNER && newRole !== GroupRole.OWNER) {
        const ownerCount = await this.prisma.groupMember.count({
          where: {
            groupId,
            role: GroupRole.OWNER,
          },
        });

        if (ownerCount <= 1) {
          return {
            success: false,
            message: 'Cannot demote the last owner. Transfer ownership first.',
          };
        }
      }

      // Update role
      await this.prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
        data: { role: newRole },
      });

      return {
        success: true,
        message: 'Member role updated successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async promoteToAdmin(groupId: string, userId: string, targetUserId: string): Promise<GroupResponse> {
    return this.changeMemberRole(groupId, userId, targetUserId, GroupRole.ADMIN);
  }

  async demoteToMember(groupId: string, userId: string, targetUserId: string): Promise<GroupResponse> {
    return this.changeMemberRole(groupId, userId, targetUserId, GroupRole.MEMBER);
  }

  async getMemberRole(groupId: string, userId: string): Promise<GroupRole | null> {
    try {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      return membership?.role || null;
    } catch (error) {
      throw error;
    }
  }

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    try {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      return !!membership;
    } catch (error) {
      throw error;
    }
  }

  async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
    try {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      return membership?.role === GroupRole.OWNER || membership?.role === GroupRole.ADMIN;
    } catch (error) {
      throw error;
    }
  }

  async isGroupOwner(groupId: string, userId: string): Promise<boolean> {
    try {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      return membership?.role === GroupRole.OWNER;
    } catch (error) {
      throw error;
    }
  }
} 