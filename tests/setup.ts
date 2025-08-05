import { PrismaClient } from '@prisma/client';

// Create a test Prisma client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
    },
  },
});

// Global test setup
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Global test teardown
afterAll(async () => {
  // Disconnect from test database
  await prisma.$disconnect();
});

// Clean up database after each test
afterEach(async () => {
  // Clean up test data
  await prisma.user.deleteMany();
});

export { prisma }; 