import { FastifySchema } from 'fastify';

export const registerSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['email', 'name'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        minLength: 1
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' },
                preferredCurrency: { type: 'string' },
                isDeleted: { type: 'boolean' },
                deletedAt: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            token: { type: 'string' },
            sessionId: { type: 'string' }
          }
        }
      }
    }
  }
};

export const loginSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email'
      },
      password: {
        type: 'string'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' },
                preferredCurrency: { type: 'string' },
                isDeleted: { type: 'boolean' },
                deletedAt: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            token: { type: 'string' },
            sessionId: { type: 'string' }
          }
        }
      }
    }
  }
};

// Password reset and change functionality is handled by Supabase
// These schemas are kept for reference but not used in our API

export const createUserSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['email', 'name'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        minLength: 1
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            avatar: { type: 'string' },
            preferredCurrency: { type: 'string' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
};

export const updateCurrentUserSchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      avatar: {
        type: 'string'
      },
      preferredCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            avatar: { type: 'string' },
            preferredCurrency: { type: 'string' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
};

export const updateUserSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      avatar: {
        type: 'string'
      },
      preferredCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            avatar: { type: 'string' },
            preferredCurrency: { type: 'string' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
};

export const getCurrentUserSchema: FastifySchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            avatar: { type: 'string' },
            preferredCurrency: { type: 'string' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
};

export const getUserSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            avatar: { type: 'string' },
            preferredCurrency: { type: 'string' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
};

export const getUsersSchema: FastifySchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              avatar: { type: 'string' },
              preferredCurrency: { type: 'string' },
              isDeleted: { type: 'boolean' },
              deletedAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  }
};

export const deleteUserSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
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
};

export const blockUserSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' }
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
};

export const unblockUserSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' }
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
};

export const getBlockedUsersSchema: FastifySchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              blockerId: { type: 'string' },
              blockedId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              blocker: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  preferredCurrency: { type: 'string' },
                  isDeleted: { type: 'boolean' },
                  deletedAt: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              },
              blocked: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  preferredCurrency: { type: 'string' },
                  isDeleted: { type: 'boolean' },
                  deletedAt: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    }
  }
};

// Group Management Schemas
export const createGroupSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      description: {
        type: 'string',
        maxLength: 500
      },
      icon: {
        type: 'string'
      },
      defaultCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3
      },
      maxMembers: {
        type: 'number',
        minimum: 2,
        maximum: 1000
      }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            defaultCurrency: { type: 'string' },
            maxMembers: { type: 'number' },
            isArchived: { type: 'boolean' },
            archivedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            ownerId: { type: 'string' },
            owner: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                members: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }
};

export const updateGroupSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      description: {
        type: 'string',
        maxLength: 500
      },
      icon: {
        type: 'string'
      },
      defaultCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3
      },
      maxMembers: {
        type: 'number',
        minimum: 2,
        maximum: 1000
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            defaultCurrency: { type: 'string' },
            maxMembers: { type: 'number' },
            isArchived: { type: 'boolean' },
            archivedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            ownerId: { type: 'string' },
            owner: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                members: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }
};

export const getGroupSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            defaultCurrency: { type: 'string' },
            maxMembers: { type: 'number' },
            isArchived: { type: 'boolean' },
            archivedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            ownerId: { type: 'string' },
            owner: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                members: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }
};

export const getGroupsSchema: FastifySchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' },
              defaultCurrency: { type: 'string' },
              maxMembers: { type: 'number' },
              isArchived: { type: 'boolean' },
              archivedAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              ownerId: { type: 'string' },
              owner: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatar: { type: 'string' }
                }
              },
              _count: {
                type: 'object',
                properties: {
                  members: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const archiveGroupSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
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
};

export const transferOwnershipSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    required: ['newOwnerId'],
    properties: {
      newOwnerId: {
        type: 'string'
      }
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
};

export const leaveGroupSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
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
};

export const getGroupMembersSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              groupId: { type: 'string' },
              userId: { type: 'string' },
              role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
              joinedAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatar: { type: 'string' }
                }
              },
              group: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  icon: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const addMemberSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string'
      },
      role: {
        type: 'string',
        enum: ['OWNER', 'ADMIN', 'MEMBER']
      }
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
};

export const removeMemberSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId', 'userId'],
    properties: {
      groupId: { type: 'string' },
      userId: { type: 'string' }
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
};

export const changeRoleSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId', 'userId'],
    properties: {
      groupId: { type: 'string' },
      userId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    required: ['role'],
    properties: {
      role: {
        type: 'string',
        enum: ['OWNER', 'ADMIN', 'MEMBER']
      }
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
};

export const createInviteSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    required: ['inviteType'],
    properties: {
      inviteType: {
        type: 'string',
        enum: ['EMAIL', 'PHONE', 'LINK']
      },
      inviteValue: {
        type: 'string'
      },
      expiresIn: {
        type: 'number',
        minimum: 1,
        maximum: 1680 // 70 days max
      }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            inviteCode: { type: 'string' },
            inviteUrl: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
};

export const joinGroupSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['inviteCode'],
    properties: {
      inviteCode: {
        type: 'string'
      }
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
};

export const getGroupInvitesSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId'],
    properties: {
      groupId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              groupId: { type: 'string' },
              invitedById: { type: 'string' },
              inviteType: { type: 'string', enum: ['EMAIL', 'PHONE', 'LINK'] },
              inviteValue: { type: 'string' },
              inviteCode: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
              isUsed: { type: 'boolean' },
              usedAt: { type: 'string', format: 'date-time' },
              usedBy: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              group: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  icon: { type: 'string' }
                }
              },
              invitedBy: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const revokeInviteSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['groupId', 'inviteId'],
    properties: {
      groupId: { type: 'string' },
      inviteId: { type: 'string' }
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
}; 