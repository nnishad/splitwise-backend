import { PrismaClient } from '@prisma/client';
import { 
  CreateGroupRequest, 
  UpdateGroupRequest, 
  GroupResponse, 
  GroupsResponse,
  GroupMembersResponse,
  TransferOwnershipRequest,
  GroupRole
} from '../types/group';

export class GroupService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createGroup(userId: string, groupData: CreateGroupRequest): Promise<GroupResponse> {
    try {
      // Validate group name
      if (!groupData.name || groupData.name.trim().length === 0) {
        return {
          success: false,
          message: 'Group name is required',
        };
      }

      if (groupData.name.length > 100) {
        return {
          success: false,
          message: 'Group name must be less than 100 characters',
        };
      }

      // Validate max members if provided
      if (groupData.maxMembers && (groupData.maxMembers < 2 || groupData.maxMembers > 1000)) {
        return {
          success: false,
          message: 'Max members must be between 2 and 1000',
        };
      }

      // Create group and add creator as owner
      const group = await this.prisma.group.create({
        data: {
          name: groupData.name.trim(),
          description: groupData.description?.trim(),
          icon: groupData.icon,
          defaultCurrency: groupData.defaultCurrency || 'USD',
          maxMembers: groupData.maxMembers,
          ownerId: userId,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      // Add creator as owner member
      await this.prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId: userId,
          role: GroupRole.OWNER,
        },
      });

      return {
        success: true,
        data: {
          id: group.id,
          name: group.name,
          description: group.description,
          icon: group.icon,
          defaultCurrency: group.defaultCurrency,
          maxMembers: group.maxMembers,
          isArchived: group.isArchived,
          archivedAt: group.archivedAt,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          ownerId: group.ownerId,
          owner: group.owner,
          _count: group._count,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getGroupById(groupId: string, userId: string): Promise<GroupResponse> {
    try {
      // Check if user is a member of the group
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership) {
        return {
          success: false,
          message: 'Group not found or you are not a member',
        };
      }

      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!group || group.isArchived) {
        return {
          success: false,
          message: 'Group not found',
        };
      }

      return {
        success: true,
        data: {
          id: group.id,
          name: group.name,
          description: group.description,
          icon: group.icon,
          defaultCurrency: group.defaultCurrency,
          maxMembers: group.maxMembers,
          isArchived: group.isArchived,
          archivedAt: group.archivedAt,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          ownerId: group.ownerId,
          owner: group.owner,
          _count: group._count,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserGroups(userId: string): Promise<GroupsResponse> {
    try {
      const memberships = await this.prisma.groupMember.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
        orderBy: {
          group: {
            updatedAt: 'desc',
          },
        },
      });

      const groups = memberships
        .map(membership => membership.group)
        .filter(group => !group.isArchived)
        .map(group => ({
          id: group.id,
          name: group.name,
          description: group.description,
          icon: group.icon,
          defaultCurrency: group.defaultCurrency,
          maxMembers: group.maxMembers,
          isArchived: group.isArchived,
          archivedAt: group.archivedAt,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          ownerId: group.ownerId,
          owner: group.owner,
          _count: group._count,
        }));

      return {
        success: true,
        data: groups,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateGroup(groupId: string, userId: string, groupData: UpdateGroupRequest): Promise<GroupResponse> {
    try {
      // Check if user is admin or owner
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
          message: 'You do not have permission to update this group',
        };
      }

      // Validate group name if provided
      if (groupData.name !== undefined) {
        if (groupData.name.trim().length === 0) {
          return {
            success: false,
            message: 'Group name cannot be empty',
          };
        }

        if (groupData.name.length > 100) {
          return {
            success: false,
            message: 'Group name must be less than 100 characters',
          };
        }
      }

      // Validate max members if provided
      if (groupData.maxMembers !== undefined) {
        if (groupData.maxMembers < 2 || groupData.maxMembers > 1000) {
          return {
            success: false,
            message: 'Max members must be between 2 and 1000',
          };
        }
      }

      const group = await this.prisma.group.update({
        where: { id: groupId },
        data: {
          name: groupData.name?.trim(),
          description: groupData.description?.trim(),
          icon: groupData.icon,
          defaultCurrency: groupData.defaultCurrency,
          maxMembers: groupData.maxMembers,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      return {
        success: true,
        data: {
          id: group.id,
          name: group.name,
          description: group.description,
          icon: group.icon,
          defaultCurrency: group.defaultCurrency,
          maxMembers: group.maxMembers,
          isArchived: group.isArchived,
          archivedAt: group.archivedAt,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          ownerId: group.ownerId,
          owner: group.owner,
          _count: group._count,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async archiveGroup(groupId: string, userId: string): Promise<GroupResponse> {
    try {
      // Check if user is owner
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
          message: 'Only the group owner can archive the group',
        };
      }

      const group = await this.prisma.group.update({
        where: { id: groupId },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      return {
        success: true,
        data: {
          id: group.id,
          name: group.name,
          description: group.description,
          icon: group.icon,
          defaultCurrency: group.defaultCurrency,
          maxMembers: group.maxMembers,
          isArchived: group.isArchived,
          archivedAt: group.archivedAt,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          ownerId: group.ownerId,
          owner: group.owner,
          _count: group._count,
        },
        message: 'Group archived successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async transferOwnership(groupId: string, userId: string, transferData: TransferOwnershipRequest): Promise<GroupResponse> {
    try {
      // Check if user is owner
      const currentMembership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!currentMembership || currentMembership.role !== GroupRole.OWNER) {
        return {
          success: false,
          message: 'Only the group owner can transfer ownership',
        };
      }

      // Check if new owner is a member
      const newOwnerMembership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: transferData.newOwnerId,
          },
        },
      });

      if (!newOwnerMembership) {
        return {
          success: false,
          message: 'New owner must be a member of the group',
        };
      }

      // Transfer ownership
      await this.prisma.$transaction([
        // Update group owner
        this.prisma.group.update({
          where: { id: groupId },
          data: { ownerId: transferData.newOwnerId },
        }),
        // Update member roles
        this.prisma.groupMember.update({
          where: {
            groupId_userId: {
              groupId,
              userId: transferData.newOwnerId,
            },
          },
          data: { role: GroupRole.OWNER },
        }),
        this.prisma.groupMember.update({
          where: {
            groupId_userId: {
              groupId,
              userId,
            },
          },
          data: { role: GroupRole.ADMIN },
        }),
      ]);

      return {
        success: true,
        message: 'Ownership transferred successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async leaveGroup(groupId: string, userId: string): Promise<GroupResponse> {
    try {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
        include: {
          group: {
            include: {
              members: {
                where: {
                  role: {
                    in: [GroupRole.OWNER, GroupRole.ADMIN],
                  },
                },
              },
            },
          },
        },
      });

      if (!membership) {
        return {
          success: false,
          message: 'You are not a member of this group',
        };
      }

      // If user is owner, check if there are other admins
      if (membership.role === GroupRole.OWNER) {
        const adminCount = membership.group.members.length;
        if (adminCount <= 1) {
          return {
            success: false,
            message: 'Cannot leave group: you are the only owner. Transfer ownership or promote another member first.',
          };
        }
      }

      // Remove member
      await this.prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      return {
        success: true,
        message: 'Left group successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async getGroupMembers(groupId: string, userId: string): Promise<GroupMembersResponse> {
    try {
      // Check if user is a member
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership) {
        return {
          success: false,
          message: 'You are not a member of this group',
        };
      }

      const members = await this.prisma.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
        },
        orderBy: [
          { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
          { joinedAt: 'asc' },
        ],
      });

      return {
        success: true,
        data: members.map(member => ({
          id: member.id,
          groupId: member.groupId,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          updatedAt: member.updatedAt,
          user: member.user,
          group: member.group,
        })),
      };
    } catch (error) {
      throw error;
    }
  }
} 