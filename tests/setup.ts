import { PrismaClient } from '@prisma/client';
import { setupTestDatabase, teardownTestDatabase } from './helpers/testHelpers';

// Create a single Prisma instance for all tests
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:mysecretpassword@localhost:5432/test_db?schema=public'
    }
  }
});

// Global test setup - cleanup at the start
beforeAll(async () => {
  await prisma.$connect();
  // Clean up any leftover data from previous test runs
  await setupTestDatabase(prisma);
});

// Global test teardown - cleanup at the end
afterAll(async () => {
  // Clean up test data after all tests
  await teardownTestDatabase(prisma);
  await prisma.$disconnect();
});

// Clean up database before each test (cleanup-first approach)
beforeEach(async () => {
  // Clean up any potential leftover state from previous test runs
  await setupTestDatabase(prisma);
});

// Clean up database after each test
afterEach(async () => {
  // Clean up test data after each test
  await teardownTestDatabase(prisma);
}); 