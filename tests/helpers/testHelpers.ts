import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import bcrypt from 'bcrypt';

export async function createTestUser(prisma: PrismaClient, email?: string, name?: string) {
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  return await prisma.user.create({
    data: {
      email: email || `test-${Date.now()}@example.com`,
      name: name || 'Test User',
      password: hashedPassword,
      preferredCurrency: 'USD'
    }
  });
}

export async function createTestGroup(prisma: PrismaClient, ownerId: string) {
  return await prisma.group.create({
    data: {
      name: 'Test Group',
      description: 'A test group for expenses',
      defaultCurrency: 'USD',
      preferredCurrency: 'USD',
      ownerId
    }
  });
}

export async function createTestExpenseSplit(prisma: PrismaClient, expenseId: string, userId: string, amount: number) {
  return await prisma.expenseSplit.create({
    data: {
      expenseId,
      userId,
      amount: new Decimal(amount),
      settledAmount: new Decimal(0)
    }
  });
}

export async function createTestGroupMember(prisma: PrismaClient, groupId: string, userId: string) {
  return await prisma.groupMember.create({
    data: {
      groupId,
      userId,
      role: 'MEMBER'
    }
  });
}

export async function createTestCategory(prisma: PrismaClient, name: string = 'Food') {
  const uniqueName = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return await prisma.category.create({
    data: {
      name: uniqueName,
      color: '#FF0000',
      isDefault: false
    }
  });
}

export async function createTestTag(prisma: PrismaClient, name: string = 'test-tag') {
  const uniqueName = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return await prisma.tag.create({
    data: {
      name: uniqueName,
      color: '#00FF00'
    }
  });
}

export async function createTestExpense(prisma: PrismaClient, data: {
  title: string;
  amount: number;
  groupId: string;
  createdById: string;
  categoryId?: string;
  tagNames?: string[];
}) {
  const expense = await prisma.expense.create({
    data: {
      title: data.title,
      amount: data.amount,
      currency: 'USD',
      date: new Date(),
      groupId: data.groupId,
      createdById: data.createdById,
      categoryId: data.categoryId
    }
  });

  // Create splits
  await prisma.expenseSplit.create({
    data: {
      expenseId: expense.id,
      userId: data.createdById,
      amount: data.amount
    }
  });

  // Create payers
  await prisma.expensePayer.create({
    data: {
      expenseId: expense.id,
      userId: data.createdById,
      amount: data.amount
    }
  });

  // Create tags if provided
  if (data.tagNames && data.tagNames.length > 0) {
    const tags = await Promise.all(
      data.tagNames.map(name => 
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name, color: '#0000FF' }
        })
      )
    );

    await Promise.all(
      tags.map(tag =>
        prisma.expenseTag.create({
          data: {
            expenseId: expense.id,
            tagId: tag.id
          }
        })
      )
    );
  }

  return expense;
}

/**
 * Comprehensive database cleanup function for test isolation
 * 
 * This function uses a "cleanup-first" approach as recommended by testing best practices.
 * It performs an aggressive cleanup using raw SQL to ensure complete isolation.
 * 
 * Based on the approach from: https://www.gustavwengel.dk/cleanup-at-the-start-of-tests
 * and: https://gist.github.com/MaxGabriel/f8b4fcc7ed773dda79c62d69742d40d1
 */
export async function cleanupTestDatabase(prisma: PrismaClient): Promise<void> {
  try {
    // Use raw SQL for more aggressive cleanup
    await prisma.$transaction(async (tx) => {
      // Disable foreign key constraints temporarily
      await tx.$executeRaw`SET session_replication_role = replica;`;
      
      // Defer all constraints to the end
      await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED;`;
      
      // Delete all data from all tables in reverse dependency order
      const tables = [
        'balance_reminder_settings',
        'settlements',
        'exchange_rates',
        'expense_comments',
        'expense_history',
        'expense_tags',
        'expense_payers',
        'expense_splits',
        'expenses',
        'expense_templates',
        'tags',
        'categories',
        'group_invites',
        'group_members',
        'groups',
        'user_blocks',
        'sessions',
        'users'
      ];

      for (const table of tables) {
        try {
          await tx.$executeRaw`DELETE FROM "${table}";`;
        } catch (error) {
          // Ignore errors - table might not exist or be empty
          console.warn(`Failed to clean table ${table}:`, error);
        }
      }

      // Re-enable foreign key constraints
      await tx.$executeRaw`SET session_replication_role = DEFAULT;`;
    });
  } catch (error) {
    // If transaction fails, try direct cleanup
    console.warn('Transaction-based cleanup failed, trying direct cleanup:', error);
    await directCleanup(prisma);
  }
}

/**
 * Direct cleanup function that bypasses transactions
 */
async function directCleanup(prisma: PrismaClient): Promise<void> {
  try {
    // Disable foreign key checks
    await prisma.$executeRaw`SET session_replication_role = replica;`;
    
    const tables = [
      'balance_reminder_settings',
      'settlements',
      'exchange_rates',
      'expense_comments',
      'expense_history',
      'expense_tags',
      'expense_payers',
      'expense_splits',
      'expenses',
      'expense_templates',
      'tags',
      'categories',
      'group_invites',
      'group_members',
      'groups',
      'user_blocks',
      'sessions',
      'users'
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRaw`DELETE FROM "${table}";`;
      } catch (error) {
        // Ignore errors - table might not exist or be empty
        console.warn(`Failed to clean table ${table}:`, error);
      }
    }

    // Re-enable foreign key checks
    await prisma.$executeRaw`SET session_replication_role = DEFAULT;`;
  } catch (error) {
    console.error('All cleanup methods failed:', error);
  }
}

/**
 * Setup function to be called before each test suite
 * Uses the "cleanup-first" approach as recommended by testing best practices
 */
export async function setupTestDatabase(prisma: PrismaClient): Promise<void> {
  // Clean up any leftover data from previous test runs
  await cleanupTestDatabase(prisma);
}

/**
 * Teardown function to be called after each test suite
 */
export async function teardownTestDatabase(prisma: PrismaClient): Promise<void> {
  // Clean up test data after the suite
  await cleanupTestDatabase(prisma);
}

/**
 * Legacy cleanup function for backward compatibility
 * @deprecated Use cleanupTestDatabase instead
 */
export async function cleanupTestData(prisma: PrismaClient) {
  return cleanupTestDatabase(prisma);
} 