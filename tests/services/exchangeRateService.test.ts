import { ExchangeRateService } from '../../src/services/exchangeRateService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
const mockPrisma = {
  exchangeRate: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn()
  }
} as unknown as PrismaClient;

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  beforeEach(() => {
    service = new ExchangeRateService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getSupportedCurrencies', () => {
    it('should return list of supported currencies', () => {
      const currencies = service.getSupportedCurrencies();
      
      expect(currencies).toBeInstanceOf(Array);
      expect(currencies.length).toBeGreaterThan(0);
      
      // Check that USD is included
      const usd = currencies.find(c => c.code === 'USD');
      expect(usd).toBeDefined();
      expect(usd?.name).toBe('US Dollar');
      expect(usd?.symbol).toBe('$');
      expect(usd?.precision).toBe(2);
    });
  });

  describe('isValidCurrency', () => {
    it('should return true for valid currencies', () => {
      expect(service.isValidCurrency('USD')).toBe(true);
      expect(service.isValidCurrency('EUR')).toBe(true);
      expect(service.isValidCurrency('JPY')).toBe(true);
    });

    it('should return false for invalid currencies', () => {
      expect(service.isValidCurrency('INVALID')).toBe(false);
      expect(service.isValidCurrency('')).toBe(false);
      expect(service.isValidCurrency('US')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(service.isValidCurrency('usd')).toBe(true);
      expect(service.isValidCurrency('Usd')).toBe(true);
    });
  });

  describe('getCurrencyInfo', () => {
    it('should return currency info for valid currencies', () => {
      const usdInfo = service.getCurrencyInfo('USD');
      expect(usdInfo).toBeDefined();
      expect(usdInfo?.code).toBe('USD');
      expect(usdInfo?.name).toBe('US Dollar');
      expect(usdInfo?.symbol).toBe('$');
    });

    it('should return null for invalid currencies', () => {
      const invalidInfo = service.getCurrencyInfo('INVALID');
      expect(invalidInfo).toBeNull();
    });
  });

  describe('formatAmount', () => {
    it('should format USD amounts correctly', () => {
      expect(service.formatAmount(123.45, 'USD')).toBe('$123.45');
      expect(service.formatAmount(1000, 'USD')).toBe('$1000.00');
    });

    it('should format JPY amounts correctly (no decimals)', () => {
      expect(service.formatAmount(1234, 'JPY')).toBe('¥1234');
      expect(service.formatAmount(1000, 'JPY')).toBe('¥1000');
    });

    it('should handle unknown currencies', () => {
      expect(service.formatAmount(123.45, 'UNKNOWN')).toBe('123.45 UNKNOWN');
    });
  });

  describe('convertAmount', () => {
    it('should convert between different currencies', async () => {
      // Mock the getExchangeRate method
      jest.spyOn(service, 'getExchangeRate').mockResolvedValue({
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        rate: 0.85,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });

      const result = await service.convertAmount(100, 'USD', 'EUR');
      
      expect(result.convertedAmount).toBe(85);
      expect(result.rate).toBe(0.85);
    });

    it('should handle same currency conversion', async () => {
      const result = await service.convertAmount(100, 'USD', 'USD');
      
      expect(result.convertedAmount).toBe(100);
      expect(result.rate).toBe(1);
    });
  });

  describe('clearExpiredRates', () => {
    it('should clear expired exchange rates', async () => {
      mockPrisma.exchangeRate.deleteMany = jest.fn().mockResolvedValue({ count: 5 });

      const result = await service.clearExpiredRates();
      
      expect(result).toBe(5);
      expect(mockPrisma.exchangeRate.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });
    });
  });
}); 