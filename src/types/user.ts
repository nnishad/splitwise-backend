export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  avatar?: string;
  preferredCurrency?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  preferredCurrency: string;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
  blocker: User;
  blocked: User;
}

export interface UserResponse {
  success: boolean;
  data?: User;
  message?: string;
}

export interface UsersResponse {
  success: boolean;
  data?: User[];
  message?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    sessionId: string;
  };
  message?: string;
}

export interface SessionsResponse {
  success: boolean;
  data?: Session[];
  message?: string;
}

export interface UserBlocksResponse {
  success: boolean;
  data?: UserBlock[];
  message?: string;
} 