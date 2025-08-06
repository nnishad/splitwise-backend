import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface ExchangeRateResponse {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  precision: number; // Number of decimal places
}

export interface CachedRate {
  rate: number;
  fetchedAt: Date;
  expiresAt: Date;
}

export class ExchangeRateService {
  private prisma: PrismaClient;
  private apiKey: string;
  private baseUrl: string;
  private memoryCache: Map<string, CachedRate> = new Map();
  private cacheExpiry: number = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.apiKey = process.env.FIXER_API_KEY || '';
    this.baseUrl = process.env.FIXER_API_URL || 'http://data.fixer.io/api';
  }

  /**
   * Get exchange rate between two currencies
   * @param fromCurrency Source currency code (e.g., 'USD')
   * @param toCurrency Target currency code (e.g., 'EUR')
   * @param forceRefresh Force fetch from API even if cached rate exists
   */
  async getExchangeRate(
    fromCurrency: string, 
    toCurrency: string, 
    forceRefresh: boolean = false
  ): Promise<ExchangeRateResponse> {
    // Normalize currency codes
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Same currency
    if (from === to) {
      return {
        fromCurrency: from,
        toCurrency: to,
        rate: 1,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    }

    // Check memory cache first
    const cacheKey = `${from}_${to}`;
    const memoryCached = this.memoryCache.get(cacheKey);
    if (!forceRefresh && memoryCached && new Date() < memoryCached.expiresAt) {
      return {
        fromCurrency: from,
        toCurrency: to,
        rate: memoryCached.rate,
        fetchedAt: memoryCached.fetchedAt,
        expiresAt: memoryCached.expiresAt
      };
    }

    // Check database cache
    if (!forceRefresh) {
      const cachedRate = await this.getCachedRate(from, to);
      if (cachedRate) {
        // Update memory cache
        this.memoryCache.set(cacheKey, {
          rate: cachedRate.rate,
          fetchedAt: cachedRate.fetchedAt,
          expiresAt: cachedRate.expiresAt
        });
        return cachedRate;
      }
    }

    // Fetch from API
    const rate = await this.fetchFromAPI(from, to);
    
    // Cache the rate in both memory and database
    await this.cacheRate(from, to, rate);
    this.memoryCache.set(cacheKey, {
      rate: rate.rate,
      fetchedAt: rate.fetchedAt,
      expiresAt: rate.expiresAt
    });

    return rate;
  }

  /**
   * Get cached exchange rate from database
   */
  private async getCachedRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateResponse | null> {
    try {
      const cached = await this.prisma.exchangeRate.findUnique({
        where: {
          fromCurrency_toCurrency: {
            fromCurrency,
            toCurrency
          }
        }
      });

      if (!cached) {
        return null;
      }

      // Check if rate is still valid
      if (new Date() > cached.expiresAt) {
        // Delete expired rate
        await this.prisma.exchangeRate.delete({
          where: { id: cached.id }
        });
        return null;
      }

      return {
        fromCurrency: cached.fromCurrency,
        toCurrency: cached.toCurrency,
        rate: Number(cached.rate),
        fetchedAt: cached.fetchedAt,
        expiresAt: cached.expiresAt
      };
    } catch (error) {
      console.error('Error getting cached rate:', error);
      return null;
    }
  }

  /**
   * Fetch exchange rate from Fixer.io API
   */
  private async fetchFromAPI(fromCurrency: string, toCurrency: string): Promise<ExchangeRateResponse> {
    try {
      // Use mock data for testing
      const { MockExchangeRateService } = await import('./mockExchangeRateService');
      const mockService = new MockExchangeRateService(this.prisma);
      
      const mockRate = await mockService.getExchangeRate(fromCurrency, toCurrency);
      
      return {
        fromCurrency: mockRate.fromCurrency,
        toCurrency: mockRate.toCurrency,
        rate: mockRate.rate,
        fetchedAt: mockRate.fetchedAt,
        expiresAt: mockRate.expiresAt
      };
    } catch (error) {
      console.error('Mock exchange rate error:', error);
      
      // Try to get the last used rate from database
      const lastUsedRate = await this.getLastUsedRate(fromCurrency, toCurrency);
      if (lastUsedRate) {
        console.log(`Using last known rate for ${fromCurrency} to ${toCurrency}: ${lastUsedRate}`);
        return {
          fromCurrency,
          toCurrency,
          rate: lastUsedRate,
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours for fallback
        };
      }
      
      throw new Error(`Failed to fetch exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the last used rate for a currency pair from expenses
   */
  private async getLastUsedRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    try {
      const lastExpense = await this.prisma.expense.findFirst({
        where: {
          currency: fromCurrency,
          exchangeRate: { not: null },
          convertedAmount: { not: null }
        },
        orderBy: { createdAt: 'desc' },
        select: { exchangeRate: true }
      });

      if (lastExpense && lastExpense.exchangeRate) {
        return Number(lastExpense.exchangeRate);
      }

      return null;
    } catch (error) {
      console.error('Error getting last used rate:', error);
      return null;
    }
  }

  /**
   * Cache exchange rate in database
   */
  private async cacheRate(fromCurrency: string, toCurrency: string, rate: ExchangeRateResponse): Promise<void> {
    try {
      await this.prisma.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency: {
            fromCurrency,
            toCurrency
          }
        },
        update: {
          rate: new Decimal(rate.rate),
          fetchedAt: rate.fetchedAt,
          expiresAt: rate.expiresAt
        },
        create: {
          fromCurrency,
          toCurrency,
          rate: new Decimal(rate.rate),
          fetchedAt: rate.fetchedAt,
          expiresAt: rate.expiresAt
        }
      });
    } catch (error) {
      console.error('Failed to cache exchange rate:', error);
      // Don't throw error for caching failures
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<{ convertedAmount: number; rate: number }> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate.rate;
    
    return {
      convertedAmount: Number(convertedAmount.toFixed(2)),
      rate: rate.rate
    };
  }

  /**
   * Get supported currencies (comprehensive list)
   */
  getSupportedCurrencies(): CurrencyInfo[] {
    return [
      // Major currencies
      { code: 'USD', name: 'US Dollar', symbol: '$', precision: 2 },
      { code: 'EUR', name: 'Euro', symbol: '€', precision: 2 },
      { code: 'GBP', name: 'British Pound', symbol: '£', precision: 2 },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', precision: 0 },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', precision: 2 },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', precision: 2 },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', precision: 2 },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', precision: 2 },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', precision: 2 },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', precision: 2 },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$', precision: 2 },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩', precision: 0 },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', precision: 2 },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', precision: 2 },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', precision: 2 },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', precision: 2 },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr', precision: 2 },
      { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', precision: 2 },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', precision: 2 },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', precision: 0 },
      
      // Additional currencies
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽', precision: 2 },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺', precision: 2 },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', precision: 2 },
      { code: 'THB', name: 'Thai Baht', symbol: '฿', precision: 2 },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', precision: 2 },
      { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', precision: 0 },
      { code: 'PHP', name: 'Philippine Peso', symbol: '₱', precision: 2 },
      { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', precision: 0 },
      { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', precision: 2 },
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', precision: 2 },
      { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', precision: 2 },
      { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', precision: 2 },
      { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', precision: 0 },
      { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', precision: 0 },
      { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', precision: 2 },
      { code: 'BWP', name: 'Botswana Pula', symbol: 'P', precision: 2 },
      { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$', precision: 2 },
      { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', precision: 2 },
      { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', precision: 2 },
      { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', precision: 2 },
      { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', precision: 2 },
      { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', precision: 2 },
      { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', precision: 2 },
      { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', precision: 0 },
      { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', precision: 3 },
      { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', precision: 2 },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', precision: 2 },
      { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', precision: 2 },
      { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', precision: 3 },
      { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', precision: 3 },
      { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', precision: 3 },
      { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', precision: 3 },
      { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', precision: 0 },
      { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', precision: 2 },
      { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', precision: 2 },
      { code: 'CLP', name: 'Chilean Peso', symbol: '$', precision: 0 },
      { code: 'COP', name: 'Colombian Peso', symbol: '$', precision: 0 },
      { code: 'ARS', name: 'Argentine Peso', symbol: '$', precision: 2 },
      { code: 'UYU', name: 'Uruguayan Peso', symbol: '$', precision: 2 },
      { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲', precision: 0 },
      { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs.', precision: 2 },
      { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', precision: 2 },
      { code: 'HNL', name: 'Honduran Lempira', symbol: 'L', precision: 2 },
      { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$', precision: 2 },
      { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', precision: 0 },
      { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', precision: 2 },
      { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', precision: 2 },
      { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', precision: 2 },
      { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$', precision: 2 },
      { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$', precision: 2 },
      { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$', precision: 2 },
      { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$', precision: 2 },
      { code: 'GYD', name: 'Guyanese Dollar', symbol: 'G$', precision: 2 },
      { code: 'SRD', name: 'Surinamese Dollar', symbol: '$', precision: 2 },
      { code: 'BMD', name: 'Bermudian Dollar', symbol: 'BD$', precision: 2 },
      { code: 'KYD', name: 'Cayman Islands Dollar', symbol: 'CI$', precision: 2 },
      { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$', precision: 2 },
      { code: 'WST', name: 'Samoan Tālā', symbol: 'T', precision: 2 },
      { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$', precision: 2 },
      { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT', precision: 0 },
      { code: 'SBD', name: 'Solomon Islands Dollar', symbol: 'SI$', precision: 2 },
      { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K', precision: 2 },
      { code: 'KMF', name: 'Comorian Franc', symbol: 'CF', precision: 0 },
      { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fdj', precision: 0 },
      { code: 'CDF', name: 'Congolese Franc', symbol: 'FC', precision: 2 },
      { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw', precision: 0 },
      { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu', precision: 0 },
      { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA', precision: 0 },
      { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', precision: 0 },
      { code: 'XPF', name: 'CFP Franc', symbol: '₣', precision: 0 },
      { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D', precision: 2 },
      { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le', precision: 2 },
      { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$', precision: 2 },
      { code: 'GNF', name: 'Guinean Franc', symbol: 'FG', precision: 0 },
      { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh.So.', precision: 2 },
      { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', precision: 2 },
      { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.', precision: 2 },
      { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SSP', precision: 2 },
      { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د', precision: 3 },
      { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', precision: 3 },
      { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', precision: 2 },
      { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', precision: 2 },
      { code: 'MRO', name: 'Mauritanian Ouguiya', symbol: 'UM', precision: 2 },
      { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', precision: 0 },
      { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA', precision: 0 },
      { code: 'XPF', name: 'CFP Franc', symbol: '₣', precision: 0 },
      { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D', precision: 2 },
      { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le', precision: 2 },
      { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$', precision: 2 },
      { code: 'GNF', name: 'Guinean Franc', symbol: 'FG', precision: 0 },
      { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh.So.', precision: 2 },
      { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', precision: 2 },
      { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.', precision: 2 },
      { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SSP', precision: 2 },
      { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د', precision: 3 },
      { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', precision: 3 },
      { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', precision: 2 },
      { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', precision: 2 },
      { code: 'MRO', name: 'Mauritanian Ouguiya', symbol: 'UM', precision: 2 }
    ];
  }

  /**
   * Validate currency code
   */
  isValidCurrency(currencyCode: string): boolean {
    const supportedCurrencies = this.getSupportedCurrencies();
    return supportedCurrencies.some(currency => currency.code === currencyCode.toUpperCase());
  }

  /**
   * Get currency info
   */
  getCurrencyInfo(currencyCode: string): CurrencyInfo | null {
    const supportedCurrencies = this.getSupportedCurrencies();
    return supportedCurrencies.find(currency => currency.code === currencyCode.toUpperCase()) || null;
  }

  /**
   * Format amount with currency symbol
   */
  formatAmount(amount: number, currencyCode: string): string {
    const currencyInfo = this.getCurrencyInfo(currencyCode);
    if (!currencyInfo) {
      return `${amount} ${currencyCode}`;
    }

    const formattedAmount = amount.toFixed(currencyInfo.precision);
    return `${currencyInfo.symbol}${formattedAmount}`;
  }

  /**
   * Clear expired exchange rates
   */
  async clearExpiredRates(): Promise<number> {
    try {
      const result = await this.prisma.exchangeRate.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      // Also clear expired memory cache
      const now = new Date();
      for (const [key, value] of this.memoryCache.entries()) {
        if (now > value.expiresAt) {
          this.memoryCache.delete(key);
        }
      }

      return result.count;
    } catch (error) {
      console.error('Error clearing expired rates:', error);
      return 0;
    }
  }

  /**
   * Get all cached rates (for debugging)
   */
  async getAllCachedRates(): Promise<ExchangeRateResponse[]> {
    try {
      const cached = await this.prisma.exchangeRate.findMany({
        orderBy: { fetchedAt: 'desc' }
      });

      return cached.map((rate: any) => ({
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        rate: Number(rate.rate),
        fetchedAt: rate.fetchedAt,
        expiresAt: rate.expiresAt
      }));
    } catch (error) {
      console.error('Error getting cached rates:', error);
      return [];
    }
  }
} 