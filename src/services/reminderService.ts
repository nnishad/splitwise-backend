import { PrismaClient } from '@prisma/client';
import {
  BalanceReminderSettings,
  ReminderSettingsResponse,
  UpdateReminderSettingsRequest,
  ReminderFrequency
} from '../types/balance';

export class ReminderService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Get reminder settings for a user in a group
  async getReminderSettings(
    groupId: string,
    userId: string
  ): Promise<ReminderSettingsResponse> {
    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Get or create reminder settings
    let settings = await this.prisma.balanceReminderSettings.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    // If no settings exist, create default ones
    if (!settings) {
      settings = await this.prisma.balanceReminderSettings.create({
        data: {
          groupId,
          userId,
          frequency: ReminderFrequency.OFF
        },
        include: {
          group: {
            select: {
              id: true,
              name: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });
    }

    return this.formatReminderSettingsResponse(settings);
  }

  // Update reminder settings
  async updateReminderSettings(
    groupId: string,
    userId: string,
    data: UpdateReminderSettingsRequest
  ): Promise<ReminderSettingsResponse> {
    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Update or create reminder settings
    const settings = await this.prisma.balanceReminderSettings.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {
        frequency: data.frequency,
        lastReminderSent: data.frequency === ReminderFrequency.OFF ? null : undefined
      },
      create: {
        groupId,
        userId,
        frequency: data.frequency
      },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return this.formatReminderSettingsResponse(settings);
  }

  // Get all users who need reminders
  async getUsersNeedingReminders(): Promise<Array<{
    userId: string;
    groupId: string;
    frequency: ReminderFrequency;
    lastReminderSent?: Date;
  }>> {
    const now = new Date();
    const usersNeedingReminders: Array<{
      userId: string;
      groupId: string;
      frequency: ReminderFrequency;
      lastReminderSent?: Date;
    }> = [];

    // Get all reminder settings
    const allSettings = await this.prisma.balanceReminderSettings.findMany({
      where: {
        frequency: {
          not: ReminderFrequency.OFF
        }
      }
    });

    for (const settings of allSettings) {
      const shouldSendReminder = this.shouldSendReminder(
        settings.frequency,
        settings.lastReminderSent,
        now
      );

      if (shouldSendReminder) {
        usersNeedingReminders.push({
          userId: settings.userId,
          groupId: settings.groupId,
          frequency: settings.frequency,
          lastReminderSent: settings.lastReminderSent || undefined
        });
      }
    }

    return usersNeedingReminders;
  }

  // Mark reminder as sent
  async markReminderSent(
    groupId: string,
    userId: string
  ): Promise<void> {
    await this.prisma.balanceReminderSettings.update({
      where: { groupId_userId: { groupId, userId } },
      data: {
        lastReminderSent: new Date()
      }
    });
  }

  // Get reminder settings for all users in a group
  async getGroupReminderSettings(
    groupId: string,
    userId: string
  ): Promise<ReminderSettingsResponse[]> {
    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    // Get all reminder settings for the group
    const settings = await this.prisma.balanceReminderSettings.findMany({
      where: { groupId },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return settings.map(this.formatReminderSettingsResponse);
  }

  // Delete reminder settings
  async deleteReminderSettings(
    groupId: string,
    userId: string
  ): Promise<void> {
    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!groupMember) {
      throw new Error('User is not a member of this group');
    }

    await this.prisma.balanceReminderSettings.delete({
      where: { groupId_userId: { groupId, userId } }
    });
  }

  // Private helper methods
  private shouldSendReminder(
    frequency: ReminderFrequency,
    lastReminderSent?: Date | null,
    now: Date = new Date()
  ): boolean {
    if (frequency === ReminderFrequency.OFF) {
      return false;
    }

    if (!lastReminderSent) {
      return true;
    }

    const timeSinceLastReminder = now.getTime() - lastReminderSent.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    switch (frequency) {
      case ReminderFrequency.DAILY:
        return timeSinceLastReminder >= oneDay;
      case ReminderFrequency.WEEKLY:
        return timeSinceLastReminder >= oneWeek;
      default:
        return false;
    }
  }

  private formatReminderSettingsResponse(settings: any): ReminderSettingsResponse {
    return {
      id: settings.id,
      groupId: settings.groupId,
      groupName: settings.group.name,
      userId: settings.userId,
      userName: settings.user.name,
      frequency: settings.frequency,
      lastReminderSent: settings.lastReminderSent?.toISOString(),
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString()
    };
  }
} 