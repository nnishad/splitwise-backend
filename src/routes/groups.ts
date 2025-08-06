import { FastifyPluginAsync } from 'fastify';
import { GroupService } from '../services/groupService';
import { GroupMemberService } from '../services/groupMemberService';
import { InviteService } from '../services/inviteService';
import { 
  CreateGroupRequest, 
  UpdateGroupRequest, 
  CreateInviteRequest,
  JoinGroupRequest,
  TransferOwnershipRequest,
  GroupRole
} from '../types/group';
import { authenticateToken } from '../middleware/auth';
import {
  createGroupSchema,
  updateGroupSchema,
  getGroupSchema,
  getGroupsSchema,
  archiveGroupSchema,
  transferOwnershipSchema,
  leaveGroupSchema,
  getGroupMembersSchema,
  addMemberSchema,
  removeMemberSchema,
  changeRoleSchema,
  createInviteSchema,
  joinGroupSchema,
  getGroupInvitesSchema,
  revokeInviteSchema,
} from '../utils/validation';

interface GroupParams {
  groupId: string;
}

interface MemberParams {
  groupId: string;
  userId: string;
}

interface InviteParams {
  groupId: string;
  inviteId: string;
}

const groupRoutes: FastifyPluginAsync = async (fastify) => {
  const groupService = new GroupService(fastify.prisma);
  const groupMemberService = new GroupMemberService(fastify.prisma);
  const inviteService = new InviteService(fastify.prisma);

  // Create group
  fastify.post(
    '/groups',
    {
      schema: createGroupSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const groupData = request.body as CreateGroupRequest;
        const result = await groupService.createGroup(request.user?.userId!, groupData);
        
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

  // Get user's groups
  fastify.get(
    '/groups',
    {
      schema: getGroupsSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const result = await groupService.getUserGroups(request.user?.userId!);
        
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

  // Get group by ID
  fastify.get(
    '/groups/:groupId',
    {
      schema: getGroupSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const result = await groupService.getGroupById(groupId, request.user?.userId!);
        
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

  // Update group
  fastify.put(
    '/groups/:groupId',
    {
      schema: updateGroupSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const groupData = request.body as UpdateGroupRequest;
        const result = await groupService.updateGroup(groupId, request.user?.userId!, groupData);
        
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

  // Archive group
  fastify.post(
    '/groups/:groupId/archive',
    {
      schema: archiveGroupSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const result = await groupService.archiveGroup(groupId, request.user?.userId!);
        
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

  // Transfer ownership
  fastify.post(
    '/groups/:groupId/transfer-ownership',
    {
      schema: transferOwnershipSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const transferData = request.body as TransferOwnershipRequest;
        const result = await groupService.transferOwnership(groupId, request.user?.userId!, transferData);
        
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

  // Leave group
  fastify.post(
    '/groups/:groupId/leave',
    {
      schema: leaveGroupSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const result = await groupService.leaveGroup(groupId, request.user?.userId!);
        
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

  // Get group members
  fastify.get(
    '/groups/:groupId/members',
    {
      schema: getGroupMembersSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const result = await groupService.getGroupMembers(groupId, request.user?.userId!);
        
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

  // Add member
  fastify.post(
    '/groups/:groupId/members',
    {
      schema: addMemberSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const { userId, role } = request.body as { userId: string; role?: GroupRole };
        const result = await groupMemberService.addMember(groupId, request.user?.userId!, userId, role);
        
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

  // Remove member
  fastify.delete(
    '/groups/:groupId/members/:userId',
    {
      schema: removeMemberSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId, userId } = request.params as MemberParams;
        const result = await groupMemberService.removeMember(groupId, request.user?.userId!, userId);
        
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

  // Change member role
  fastify.put(
    '/groups/:groupId/members/:userId/role',
    {
      schema: changeRoleSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId, userId } = request.params as MemberParams;
        const { role } = request.body as { role: GroupRole };
        const result = await groupMemberService.changeMemberRole(groupId, request.user?.userId!, userId, role);
        
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

  // Promote to admin
  fastify.post(
    '/groups/:groupId/members/:userId/promote',
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId, userId } = request.params as MemberParams;
        const result = await groupMemberService.promoteToAdmin(groupId, request.user?.userId!, userId);
        
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

  // Demote to member
  fastify.post(
    '/groups/:groupId/members/:userId/demote',
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId, userId } = request.params as MemberParams;
        const result = await groupMemberService.demoteToMember(groupId, request.user?.userId!, userId);
        
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

  // Create invite
  fastify.post(
    '/groups/:groupId/invites',
    {
      schema: createInviteSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const inviteData = request.body as CreateInviteRequest;
        const result = await inviteService.createInvite(groupId, request.user?.userId!, inviteData);
        
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

  // Get group invites
  fastify.get(
    '/groups/:groupId/invites',
    {
      schema: getGroupInvitesSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId } = request.params as GroupParams;
        const result = await inviteService.getGroupInvites(groupId, request.user?.userId!);
        
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

  // Revoke invite
  fastify.delete(
    '/groups/:groupId/invites/:inviteId',
    {
      schema: revokeInviteSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { groupId, inviteId } = request.params as InviteParams;
        const result = await inviteService.revokeInvite(groupId, request.user?.userId!, inviteId);
        
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

  // Join group via invite
  fastify.post(
    '/groups/join',
    {
      schema: joinGroupSchema,
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const joinData = request.body as JoinGroupRequest;
        const result = await inviteService.joinGroup(request.user?.userId!, joinData);
        
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
};

export default groupRoutes; 