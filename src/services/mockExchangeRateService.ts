import { PrismaClient } from '@prisma/client';

export interface MockExchangeRate {
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
  precision: number;
}

export class MockExchangeRateService {
  private prisma: PrismaClient;
  private mockRates: Map<string, MockExchangeRate> = new Map();
  private supportedCurrencies: CurrencyInfo[] = [
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
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', precision: 2 },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', precision: 2 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', precision: 2 },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', precision: 2 },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', precision: 2 },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', precision: 2 },
    { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', precision: 2 },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', precision: 2 },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', precision: 0 }
  ];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeMockRates();
  }

  private initializeMockRates() {
    const baseRates = {
      'USD': 1.0,
      'EUR': 0.85,
      'GBP': 0.73,
      'JPY': 110.0,
      'CAD': 1.25,
      'AUD': 1.35,
      'CHF': 0.92,
      'CNY': 6.45,
      'INR': 74.5,
      'BRL': 5.2,
      'MXN': 20.1,
      'SGD': 1.35,
      'HKD': 7.75,
      'NZD': 1.42,
      'SEK': 8.5,
      'NOK': 8.8,
      'DKK': 6.2,
      'PLN': 3.8,
      'CZK': 21.5,
      'HUF': 300.0
    };

    // Generate all possible currency pairs
    for (const fromCurrency of Object.keys(baseRates)) {
      for (const toCurrency of Object.keys(baseRates)) {
        if (fromCurrency !== toCurrency) {
          const rate = baseRates[toCurrency as keyof typeof baseRates] / baseRates[fromCurrency as keyof typeof baseRates];
          const key = `${fromCurrency}_${toCurrency}`;
          this.mockRates.set(key, {
            fromCurrency,
            toCurrency,
            rate: parseFloat(rate.toFixed(6)),
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          });
        }
      }
    }
  }

  public isValidCurrency(currency: string): boolean {
    return this.supportedCurrencies.some(c => c.code === currency.toUpperCase());
  }

  public getSupportedCurrencies(): CurrencyInfo[] {
    return this.supportedCurrencies;
  }

  public async getExchangeRate(fromCurrency: string, toCurrency: string, forceRefresh: boolean = false): Promise<MockExchangeRate> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (!this.isValidCurrency(from) || !this.isValidCurrency(to)) {
      throw new Error(`Invalid currency: ${from} or ${to}`);
    }

    if (from === to) {
      return {
        fromCurrency: from,
        toCurrency: to,
        rate: 1.0,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }

    const key = `${from}_${to}`;
    const existingRate = this.mockRates.get(key);

    if (existingRate && !forceRefresh && existingRate.expiresAt > new Date()) {
      return existingRate;
    }

    // Generate a realistic rate with some variation
    const baseRate = this.getBaseRate(from, to);
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    const rate = baseRate * (1 + variation);

    const newRate: MockExchangeRate = {
      fromCurrency: from,
      toCurrency: to,
      rate: parseFloat(rate.toFixed(6)),
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    this.mockRates.set(key, newRate);
    return newRate;
  }

  private getBaseRate(fromCurrency: string, toCurrency: string): number {
    const baseRates: { [key: string]: number } = {
      'USD': 1.0,
      'EUR': 0.85,
      'GBP': 0.73,
      'JPY': 110.0,
      'CAD': 1.25,
      'AUD': 1.35,
      'CHF': 0.92,
      'CNY': 6.45,
      'INR': 74.5,
      'BRL': 5.2,
      'MXN': 20.1,
      'SGD': 1.35,
      'HKD': 7.75,
      'NZD': 1.42,
      'SEK': 8.5,
      'NOK': 8.8,
      'DKK': 6.2,
      'PLN': 3.8,
      'CZK': 21.5,
      'HUF': 300.0
    };

    const fromRate = baseRates[fromCurrency] || 1.0;
    const toRate = baseRates[toCurrency] || 1.0;
    return toRate / fromRate;
  }

  public async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<{
    convertedAmount: number;
    rate: number;
    fromCurrency: string;
    toCurrency: string;
  }> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return {
      convertedAmount: amount * rate.rate,
      rate: rate.rate,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency
    };
  }

  public formatAmount(amount: number, currency: string): string {
    const currencyInfo = this.supportedCurrencies.find(c => c.code === currency);
    if (!currencyInfo) {
      return `${amount.toFixed(2)} ${currency}`;
    }

    const formattedAmount = amount.toFixed(currencyInfo.precision);
    return `${currencyInfo.symbol}${formattedAmount}`;
  }

  public async clearExpiredRates(): Promise<number> {
    const now = new Date();
    let clearedCount = 0;

    for (const [key, rate] of this.mockRates.entries()) {
      if (rate.expiresAt < now) {
        this.mockRates.delete(key);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  public async getLastUsedRate(fromCurrency: string, toCurrency: string): Promise<MockExchangeRate | null> {
    const key = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
    return this.mockRates.get(key) || null;
  }
} 