export enum GroupRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum InviteType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  LINK = 'LINK'
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  icon?: string;
  defaultCurrency?: string;
  maxMembers?: number;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  icon?: string;
  defaultCurrency?: string;
  maxMembers?: number;
}

export interface CreateInviteRequest {
  inviteType: InviteType;
  inviteValue: string; // Email, phone, or leave empty for link
  expiresIn?: number; // Hours until expiration, default 7 days
}

export interface JoinGroupRequest {
  inviteCode: string;
}

export interface TransferOwnershipRequest {
  newOwnerId: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  defaultCurrency: string;
  maxMembers?: number;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  _count?: {
    members: number;
  };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  group: {
    id: string;
    name: string;
    icon?: string;
  };
}

export interface GroupInvite {
  id: string;
  groupId: string;
  invitedById: string;
  inviteType: InviteType;
  inviteValue: string;
  inviteCode: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  usedBy?: string;
  createdAt: Date;
  group: {
    id: string;
    name: string;
    icon?: string;
  };
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface GroupResponse {
  success: boolean;
  data?: Group;
  message?: string;
}

export interface GroupsResponse {
  success: boolean;
  data?: Group[];
  message?: string;
}

export interface GroupMembersResponse {
  success: boolean;
  data?: GroupMember[];
  message?: string;
}

export interface GroupInvitesResponse {
  success: boolean;
  data?: GroupInvite[];
  message?: string;
}

export interface InviteResponse {
  success: boolean;
  data?: {
    inviteCode: string;
    inviteUrl: string;
    expiresAt: Date;
  };
  message?: string;
} 