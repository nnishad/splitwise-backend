import { PrismaClient } from '@prisma/client';
import { AuthUtils } from '../utils/auth';
import { 
  CreateUserRequest, 
  LoginRequest, 
  AuthResponse, 
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  ChangePasswordRequest,
  UserResponse 
} from '../types/user';

export class AuthService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      // Validate email format
      if (!AuthUtils.validateEmail(userData.email)) {
        return {
          success: false,
          message: 'Invalid email format',
        };
      }

      // Validate password strength
      const passwordValidation = AuthUtils.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists',
        };
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(userData.password);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
        },
      });

      // Create session and generate token
      const session = await this.createSession(user.id);
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        sessionId: session.id,
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            preferredCurrency: user.preferredCurrency,
            isDeleted: user.isDeleted,
            deletedAt: user.deletedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          token,
          sessionId: session.id,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: loginData.email },
      });

      if (!user || user.isDeleted) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Verify password
      const isPasswordValid = await AuthUtils.comparePassword(
        loginData.password,
        user.password
      );

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Create session and generate token
      const session = await this.createSession(user.id);
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        sessionId: session.id,
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            preferredCurrency: user.preferredCurrency,
            isDeleted: user.isDeleted,
            deletedAt: user.deletedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          token,
          sessionId: session.id,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async requestPasswordReset(resetData: PasswordResetRequest): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: resetData.email },
      });

      if (!user || user.isDeleted) {
        // Return success even if user doesn't exist for security
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        };
      }

      // Generate reset token (in a real app, this would be sent via email)
      const resetToken = AuthUtils.generateResetToken();
      
      // Store reset token in user record (you might want a separate table for this)
      // For now, we'll just return success
      
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(resetData: PasswordResetConfirmRequest): Promise<UserResponse> {
    try {
      // Validate password strength
      const passwordValidation = AuthUtils.validatePassword(resetData.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // In a real app, you would verify the reset token
      // For now, we'll just return an error
      return {
        success: false,
        message: 'Invalid or expired reset token',
      };
    } catch (error) {
      throw error;
    }
  }

  async changePassword(userId: string, changeData: ChangePasswordRequest): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.isDeleted) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthUtils.comparePassword(
        changeData.currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      // Validate new password strength
      const passwordValidation = AuthUtils.validatePassword(changeData.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // Hash new password
      const hashedNewPassword = await AuthUtils.hashPassword(changeData.newPassword);

      // Update password
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return {
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          preferredCurrency: updatedUser.preferredCurrency,
          isDeleted: updatedUser.isDeleted,
          deletedAt: updatedUser.deletedAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        message: 'Password changed successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async logout(sessionId: string): Promise<UserResponse> {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async logoutAllDevices(userId: string): Promise<UserResponse> {
    try {
      await this.prisma.session.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'Logged out from all devices successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  private async createSession(userId: string): Promise<any> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day from now

    return this.prisma.session.create({
      data: {
        userId,
        token: AuthUtils.generateResetToken(), // Generate a unique token
        expiresAt,
      },
    });
  }
} 