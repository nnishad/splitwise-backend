import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExchangeRateService } from '../services/exchangeRateService';
import { authenticateUser } from '../middleware/auth';
import { 
  exchangeRateSchema,
  ExchangeRateRequest,
  ExchangeRateResponse,
  CurrencyInfo
} from '../types/expense';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export default async function exchangeRateRoutes(fastify: FastifyInstance) {
  const exchangeRateService = new ExchangeRateService(fastify.prisma);

  // Get exchange rate between two currencies
  fastify.get('/exchange-rates', {
    schema: {
      querystring: exchangeRateSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                fromCurrency: { type: 'string' },
                toCurrency: { type: 'string' },
                rate: { type: 'number' },
                fetchedAt: { type: 'string' },
                expiresAt: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { fromCurrency, toCurrency, forceRefresh } = request.query as ExchangeRateRequest;
      
      // Validate currencies
      if (!exchangeRateService.isValidCurrency(fromCurrency)) {
        return reply.code(400).send({
          success: false,
          message: `Invalid from currency: ${fromCurrency}`
        });
      }

      if (!exchangeRateService.isValidCurrency(toCurrency)) {
        return reply.code(400).send({
          success: false,
          message: `Invalid to currency: ${toCurrency}`
        });
      }

      const rate = await exchangeRateService.getExchangeRate(fromCurrency, toCurrency, forceRefresh);
      
      reply.send({
        success: true,
        data: {
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
          rate: rate.rate,
          fetchedAt: rate.fetchedAt.toISOString(),
          expiresAt: rate.expiresAt.toISOString()
        }
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get supported currencies
  fastify.get('/currencies', {
    schema: {
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
                  code: { type: 'string' },
                  name: { type: 'string' },
                  symbol: { type: 'string' },
                  precision: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const currencies = exchangeRateService.getSupportedCurrencies();
      
      reply.send({
        success: true,
        data: currencies
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Convert amount between currencies
  fastify.post('/convert', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'fromCurrency', 'toCurrency'],
        properties: {
          amount: { type: 'number', minimum: 0.01 },
          fromCurrency: { type: 'string', minLength: 3, maxLength: 3 },
          toCurrency: { type: 'string', minLength: 3, maxLength: 3 }
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
                originalAmount: { type: 'number' },
                convertedAmount: { type: 'number' },
                fromCurrency: { type: 'string' },
                toCurrency: { type: 'string' },
                rate: { type: 'number' },
                displayOriginal: { type: 'string' },
                displayConverted: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { amount, fromCurrency, toCurrency } = request.body as {
        amount: number;
        fromCurrency: string;
        toCurrency: string;
      };

      // Validate currencies
      if (!exchangeRateService.isValidCurrency(fromCurrency)) {
        return reply.code(400).send({
          success: false,
          message: `Invalid from currency: ${fromCurrency}`
        });
      }

      if (!exchangeRateService.isValidCurrency(toCurrency)) {
        return reply.code(400).send({
          success: false,
          message: `Invalid to currency: ${toCurrency}`
        });
      }

      const conversion = await exchangeRateService.convertAmount(amount, fromCurrency, toCurrency);
      
      reply.send({
        success: true,
        data: {
          originalAmount: amount,
          convertedAmount: conversion.convertedAmount,
          fromCurrency,
          toCurrency,
          rate: conversion.rate,
          displayOriginal: exchangeRateService.formatAmount(amount, fromCurrency),
          displayConverted: exchangeRateService.formatAmount(conversion.convertedAmount, toCurrency)
        }
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Override exchange rate for an expense (admin/owner only)
  fastify.post('/expenses/:id/exchange-rate-override', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        required: ['exchangeRate'],
        properties: {
          exchangeRate: { type: 'number', minimum: 0.000001 }
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
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { exchangeRate } = request.body as { exchangeRate: number };

      // Check if expense exists and user has permission
      const expense = await fastify.prisma.expense.findUnique({
        where: { id },
        include: {
          group: {
            include: {
              members: true
            }
          }
        }
      });

      if (!expense) {
        return reply.code(404).send({
          success: false,
          message: 'Expense not found'
        });
      }

      // Check if user is group owner or admin
      const userMembership = expense.group.members.find(
        member => member.userId === request.user.id
      );

      if (!userMembership || (userMembership.role !== 'OWNER' && userMembership.role !== 'ADMIN')) {
        return reply.code(403).send({
          success: false,
          message: 'Only group owners and admins can override exchange rates'
        });
      }

      // Update the expense with the new exchange rate
      await fastify.prisma.expense.update({
        where: { id },
        data: {
          exchangeRate: new (require('@prisma/client/runtime/library').Decimal)(exchangeRate),
          convertedAmount: new (require('@prisma/client/runtime/library').Decimal)(
            Number(expense.amount) * exchangeRate
          )
        }
      });

      // Log the action
      await fastify.prisma.expenseHistory.create({
        data: {
          expenseId: id,
          action: 'EXCHANGE_RATE_OVERRIDE',
          userId: request.user.id,
          oldData: { exchangeRate: expense.exchangeRate },
          newData: { exchangeRate }
        }
      });

      reply.send({
        success: true,
        message: 'Exchange rate override applied successfully'
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Clear expired exchange rates (admin endpoint)
  fastify.post('/exchange-rates/clear-expired', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            clearedCount: { type: 'number' }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const clearedCount = await exchangeRateService.clearExpiredRates();
      
      reply.send({
        success: true,
        message: `Cleared ${clearedCount} expired exchange rates`,
        clearedCount
      });
    } catch (error: any) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
} 