import Fastify from 'fastify';
import dotenv from 'dotenv';
import prismaPlugin from './plugins/prisma';
import swaggerPlugin from './plugins/swagger';
import userRoutes from './routes/users';
import supabaseAuthRoutes from './routes/supabaseAuth';
import groupRoutes from './routes/groups';
import expenseRoutes from './routes/expenses';
import expenseTemplateRoutes from './routes/expenseTemplates';
import exchangeRateRoutes from './routes/exchangeRates';
import balanceRoutes from './routes/balances';
import auditRoutes from './routes/audit';

// Load environment variables
dotenv.config();

export const build = async () => {
  const server = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
  });

  // Register plugins
  await server.register(prismaPlugin);
  await server.register(swaggerPlugin);

  // Register routes
  await server.register(supabaseAuthRoutes, { prefix: '/api/v1' });
  await server.register(userRoutes, { prefix: '/api/v1' });
  await server.register(groupRoutes, { prefix: '/api/v1' });
  await server.register(expenseRoutes, { prefix: '/api/v1' });
  await server.register(expenseTemplateRoutes, { prefix: '/api/v1' });
  await server.register(exchangeRateRoutes, { prefix: '/api/v1' });
  await server.register(balanceRoutes, { prefix: '/api/v1' });
  await server.register(auditRoutes, { prefix: '/api/v1' });

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    return { status: 'OK', timestamp: new Date().toISOString() };
  });

  // Root endpoint
  server.get('/', async (request, reply) => {
    return {
      message: 'Splitwise Backend API',
      version: '1.0.0',
      documentation: '/documentation',
      health: '/health',
    };
  });

  return server;
};

const start = async () => {
  try {
    const server = await build();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const host = '0.0.0.0';

    await server.listen({ port, host });
    
    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/documentation`);
    console.log(`🏥 Health Check: http://localhost:${port}/health`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Only start the server if this file is run directly
if (require.main === module) {
  start();
} 