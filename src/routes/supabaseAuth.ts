import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase, createAuthAuditLog } from '../utils/supabase';
import { PrismaClient } from '@prisma/client';

interface SignUpRequest {
  email: string;
  password: string;
  name: string;
  preferredCurrency?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
  preferredCurrency?: string;
}

export default async function supabaseAuthRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as PrismaClient;

  // Sign up with Supabase
  fastify.post('/auth/signup', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 1 },
          preferredCurrency: { type: 'string', default: 'USD' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                preferredCurrency: { type: 'string' }
              }
            },
            session: {
              type: 'object',
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                expires_at: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: SignUpRequest }>, reply: FastifyReply) => {
    try {
      const { email, password, name, preferredCurrency = 'USD' } = request.body;

      // Check if user already exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return reply.status(400).send({
          success: false,
          message: 'User already exists'
        });
      }

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            preferred_currency: preferredCurrency
          }
        }
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }

      if (!data.user) {
        return reply.status(400).send({
          success: false,
          message: 'Failed to create user'
        });
      }

      // Create user in our database
      const user = await prisma.user.create({
        data: {
          id: data.user.id,
          email,
          name,
          preferredCurrency,
          isDeleted: false
        }
      });

      // Log successful registration
      await createAuthAuditLog({
        action: 'signup_success',
        userId: user.id,
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          email: email
        }
      });

      return reply.status(201).send({
        success: true,
        message: 'User created successfully. Please check your email for verification.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          preferredCurrency: user.preferredCurrency
        },
        session: data.session
      });

    } catch (error) {
      console.error('Signup error:', error);
      
      // Log failed registration
      await createAuthAuditLog({
        action: 'signup_failed',
        userId: 'unknown',
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          email: request.body?.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Sign in with Supabase
  fastify.post('/auth/signin', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' },
                preferredCurrency: { type: 'string' }
              }
            },
            session: {
              type: 'object',
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                expires_at: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: SignInRequest }>, reply: FastifyReply) => {
    try {
      const { email, password } = request.body;

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Log failed login attempt
        await createAuthAuditLog({
          action: 'signin_failed',
          userId: 'unknown',
          metadata: {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            email: email,
            error: error.message
          }
        });

        return reply.status(401).send({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (!data.user) {
        return reply.status(401).send({
          success: false,
          message: 'User not found'
        });
      }

      // Get user from our database
      const user = await prisma.user.findUnique({
        where: {
          id: data.user.id,
          isDeleted: false
        }
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          message: 'User not found in database'
        });
      }

      // Log successful login
      await createAuthAuditLog({
        action: 'signin_success',
        userId: user.id,
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          email: email
        }
      });

      return reply.status(200).send({
        success: true,
        message: 'Signed in successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferredCurrency: user.preferredCurrency
        },
        session: data.session
      });

    } catch (error) {
      console.error('Signin error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Sign out
  fastify.post('/auth/signout', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      let userId = 'unknown';
      if (token) {
        try {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) userId = user.id;
        } catch (error) {
          console.error('Error getting user for logout:', error);
        }
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        return reply.status(500).send({
          success: false,
          message: 'Error signing out'
        });
      }

      // Log successful logout
      await createAuthAuditLog({
        action: 'signout_success',
        userId: userId,
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.status(200).send({
        success: true,
        message: 'Signed out successfully'
      });

    } catch (error) {
      console.error('Signout error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Get current user
  fastify.get('/auth/me', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' },
                preferredCurrency: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return reply.status(401).send({
          success: false,
          message: 'No token provided'
        });
      }

      // Get user from Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return reply.status(401).send({
          success: false,
          message: 'Invalid token'
        });
      }

      // Get user from our database
      const dbUser = await prisma.user.findUnique({
        where: {
          id: user.id,
          isDeleted: false
        }
      });

      if (!dbUser) {
        return reply.status(401).send({
          success: false,
          message: 'User not found'
        });
      }

      return reply.status(200).send({
        success: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatar: dbUser.avatar,
          preferredCurrency: dbUser.preferredCurrency
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Update user profile
  fastify.put('/auth/profile', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          avatar: { type: 'string' },
          preferredCurrency: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' },
                preferredCurrency: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: UpdateProfileRequest }>, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return reply.status(401).send({
          success: false,
          message: 'No token provided'
        });
      }

      // Get user from Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return reply.status(401).send({
          success: false,
          message: 'Invalid token'
        });
      }

      const { name, avatar, preferredCurrency } = request.body;

      // Update user in our database
      const updatedUser = await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          ...(name && { name }),
          ...(avatar && { avatar }),
          ...(preferredCurrency && { preferredCurrency })
        }
      });

      // Log profile update
      await createAuthAuditLog({
        action: 'profile_updated',
        userId: user.id,
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          updatedFields: Object.keys(request.body)
        }
      });

      return reply.status(200).send({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          preferredCurrency: updatedUser.preferredCurrency
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Refresh token
  fastify.post('/auth/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            session: {
              type: 'object',
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                expires_at: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { refresh_token: string } }>, reply: FastifyReply) => {
    try {
      const { refresh_token } = request.body;

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });

      if (error) {
        return reply.status(401).send({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      return reply.status(200).send({
        success: true,
        session: data.session
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Request password reset (uses Supabase's built-in functionality)
  fastify.post('/auth/password-reset', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) => {
    try {
      const { email } = request.body;

      // Use Supabase's built-in password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }

      // Log password reset request
      await createAuthAuditLog({
        action: 'password_reset_requested',
        userId: 'unknown',
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          email: email
        }
      });

      return reply.status(200).send({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });

    } catch (error) {
      console.error('Password reset error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Update password (requires authenticated user)
  fastify.post('/auth/update-password', {
    schema: {
      body: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string', minLength: 6 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { password: string } }>, reply: FastifyReply) => {
    try {
      const { password } = request.body;
      const authHeader = request.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return reply.status(401).send({
          success: false,
          message: 'Access token is required'
        });
      }

      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }

      // Log password update
      await createAuthAuditLog({
        action: 'password_updated',
        userId: 'authenticated',
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.status(200).send({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error) {
      console.error('Update password error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });
} 