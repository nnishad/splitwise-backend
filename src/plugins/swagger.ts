import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Splitwise Backend API',
        description: 'CRUD API server with Fastify and PostgreSQL',
        version: '1.0.0',
      },
      host: 'localhost:3000',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        BearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Enter your Supabase access token in the format: Bearer <token>'
        }
      },
      security: [
        {
          BearerAuth: []
        }
      ],
      tags: [
        { name: 'auth', description: 'Authentication routes' },
        { name: 'users', description: 'User management routes' },
        { name: 'sessions', description: 'Session management routes' },
        { name: 'groups', description: 'Group management routes' },
        { name: 'expenses', description: 'Expense management routes' },
        { name: 'expenseTemplates', description: 'Expense template routes' },
        { name: 'balances', description: 'Balance and settlement routes' },
        { name: 'exchangeRates', description: 'Exchange rate routes' },
        { name: 'audit', description: 'Audit and logging routes' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'none', // Collapse all sections by default
      deepLinking: false,
      defaultModelsExpandDepth: -1, // Hide schemas section
      defaultModelExpandDepth: 1, // Show only first level of model properties
      displayRequestDuration: true,
      filter: true, // Enable search/filter functionality
      showExtensions: true,
      showCommonExtensions: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });
};

export default fp(swaggerPlugin); 