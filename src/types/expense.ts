import { Decimal } from '@prisma/client/runtime/library';

// Enums
export enum RecurringPattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM'
}

export enum ExpenseAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
  SPLIT_CHANGED = 'SPLIT_CHANGED',
  PAYER_CHANGED = 'PAYER_CHANGED',
  CATEGORY_CHANGED = 'CATEGORY_CHANGED',
  TAGS_CHANGED = 'TAGS_CHANGED',
  CURRENCY_CHANGED = 'CURRENCY_CHANGED',
  EXCHANGE_RATE_OVERRIDE = 'EXCHANGE_RATE_OVERRIDE'
}

export enum SplitType {
  EQUAL = 'EQUAL',
  PERCENTAGE = 'PERCENTAGE',
  AMOUNT = 'AMOUNT',
  SHARES = 'SHARES'
}

// Base Types
export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: Decimal;
  percentage?: Decimal;
  shares?: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface ExpensePayer {
  id: string;
  expenseId: string;
  userId: string;
  amount: Decimal;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface ExpenseComment {
  id: string;
  expenseId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface ExpenseHistory {
  id: string;
  expenseId: string;
  action: ExpenseAction;
  oldData?: any;
  newData?: any;
  userId: string;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
  };
}

export interface ExchangeRateInfo {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: Decimal;
  currency: string;
  exchangeRate?: Decimal;
  originalCurrency?: string;
  convertedAmount?: Decimal;
  date: Date;
  location?: string;
  isArchived: boolean;
  archivedAt?: Date;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  nextRecurringDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  groupId: string;
  group?: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  categoryId?: string;
  category?: Category;
  splits?: ExpenseSplit[];
  payers?: ExpensePayer[];
  tags?: Tag[];
  comments?: ExpenseComment[];
  history?: ExpenseHistory[];
}

// Request DTOs
export interface CreateExpenseRequest {
  title: string;
  description?: string;
  amount: number;
  currency?: string; // Optional - defaults to group's default currency
  exchangeRateOverride?: number; // Optional - custom exchange rate
  date?: string;
  location?: string;
  groupId: string;
  categoryId?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  nextRecurringDate?: string;
  
  // Splits configuration
  splitType: SplitType;
  splits: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
  
  // Payers configuration
  payers: {
    userId: string;
    amount: number;
  }[];
  
  // Tags
  tagNames?: string[];
  
  // Comments
  comment?: string;
}

export interface UpdateExpenseRequest {
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  exchangeRateOverride?: number;
  date?: string;
  location?: string;
  categoryId?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  nextRecurringDate?: string;
  
  // Splits configuration
  splitType?: SplitType;
  splits?: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
  
  // Payers configuration
  payers?: {
    userId: string;
    amount: number;
  }[];
  
  // Tags
  tagNames?: string[];
}

export interface BulkUpdateExpenseRequest {
  expenseIds: string[];
  updates: Partial<UpdateExpenseRequest>;
}

export interface BulkDeleteExpenseRequest {
  expenseIds: string[];
}

export interface SearchExpensesRequest {
  query?: string;
  groupId?: string;
  userId?: string;
  categoryId?: string;
  tagNames?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  currency?: string; // Filter by currency
  isArchived?: boolean;
  isRecurring?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'title' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface FilterExpensesRequest {
  groupId?: string;
  userId?: string;
  categoryId?: string;
  tagNames?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  currency?: string;
  isArchived?: boolean;
  isRecurring?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'title' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Response DTOs
export interface ExpenseResponse {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  originalCurrency?: string;
  convertedAmount?: number;
  date: string;
  location?: string;
  isArchived: boolean;
  archivedAt?: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  nextRecurringDate?: string;
  createdAt: string;
  updatedAt: string;
  
  group: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  category?: Category;
  splits: ExpenseSplit[];
  payers: ExpensePayer[];
  tags: Tag[];
  comments: ExpenseComment[];
  totalPaid: number;
  totalSplit: number;
  balance: number;
  
  // Currency display info
  displayAmount?: string; // Formatted amount with currency symbol
  displayConvertedAmount?: string; // Formatted converted amount
}

export interface ExpenseListResponse {
  expenses: ExpenseResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CategoryResponse {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  expenseCount: number;
}

export interface TagResponse {
  id: string;
  name: string;
  color?: string;
  expenseCount: number;
}

export interface ExpenseSummaryResponse {
  totalExpenses: number;
  totalAmount: number;
  currency: string;
  averageAmount: number;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    count: number;
    amount: number;
  }[];
  monthlyBreakdown: {
    month: string;
    count: number;
    amount: number;
  }[];
  // Multi-currency summary
  currencyBreakdown: {
    currency: string;
    count: number;
    amount: number;
    convertedAmount: number;
  }[];
}

// Exchange Rate Types
export interface ExchangeRateRequest {
  fromCurrency: string;
  toCurrency: string;
  forceRefresh?: boolean;
}

export interface ExchangeRateResponse {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fetchedAt: string;
  expiresAt: string;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  precision: number;
}

// Expense Template Types
export interface ExpenseTemplate {
  id: string;
  name: string;
  description?: string;
  amount: Decimal;
  currency: string;
  groupId: string;
  categoryId?: string;
  splitType: SplitType;
  splits: any[]; // JSON array of split configurations
  payers: any[]; // JSON array of payer configurations
  tagNames?: string[];
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  nextRecurringDate?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  group?: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
  createdBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  category?: Category;
}

export interface CreateExpenseTemplateRequest {
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  groupId: string;
  categoryId?: string;
  splitType: SplitType;
  splits: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
  payers: {
    userId: string;
    amount: number;
  }[];
  tagNames?: string[];
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  nextRecurringDate?: string;
}

export interface UpdateExpenseTemplateRequest {
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  categoryId?: string;
  splitType?: SplitType;
  splits?: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
  payers?: {
    userId: string;
    amount: number;
  }[];
  tagNames?: string[];
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  nextRecurringDate?: string;
}

export interface ExpenseTemplateResponse {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  group: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  category?: Category;
  splits: any[];
  payers: any[];
  tags: Tag[];
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  nextRecurringDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Validation Schemas
export const createExpenseSchema = {
  type: 'object',
  required: ['title', 'amount', 'groupId', 'splitType', 'splits', 'payers'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    amount: { type: 'number', minimum: 0.01 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    exchangeRateOverride: { type: 'number', minimum: 0.000001 },
    date: { type: 'string', format: 'date-time' },
    location: { type: 'string', maxLength: 255 },
    groupId: { type: 'string' },
    categoryId: { type: 'string' },
    isRecurring: { type: 'boolean' },
    recurringPattern: { type: 'string', enum: Object.values(RecurringPattern) },
    nextRecurringDate: { type: 'string', format: 'date-time' },
    splitType: { type: 'string', enum: Object.values(SplitType) },
    splits: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
          percentage: { type: 'number', minimum: 0, maximum: 100 },
          shares: { type: 'integer', minimum: 1 }
        }
      }
    },
    payers: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['userId', 'amount'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 0.01 }
        }
      }
    },
    tagNames: {
      type: 'array',
      items: { type: 'string', maxLength: 50 }
    },
    comment: { type: 'string', maxLength: 500 }
  }
};

export const updateExpenseSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    amount: { type: 'number', minimum: 0.01 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    exchangeRateOverride: { type: 'number', minimum: 0.000001 },
    date: { type: 'string', format: 'date-time' },
    location: { type: 'string', maxLength: 255 },
    categoryId: { type: 'string' },
    isRecurring: { type: 'boolean' },
    recurringPattern: { type: 'string', enum: Object.values(RecurringPattern) },
    nextRecurringDate: { type: 'string', format: 'date-time' },
    splitType: { type: 'string', enum: Object.values(SplitType) },
    splits: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
          percentage: { type: 'number', minimum: 0, maximum: 100 },
          shares: { type: 'integer', minimum: 1 }
        }
      }
    },
    payers: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['userId', 'amount'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 0.01 }
        }
      }
    },
    tagNames: {
      type: 'array',
      items: { type: 'string', maxLength: 50 }
    }
  }
};

export const searchExpensesSchema = {
  type: 'object',
  properties: {
    query: { type: 'string', maxLength: 255 },
    groupId: { type: 'string' },
    userId: { type: 'string' },
    categoryId: { type: 'string' },
    tagNames: {
      type: 'array',
      items: { type: 'string' }
    },
    dateFrom: { type: 'string', format: 'date-time' },
    dateTo: { type: 'string', format: 'date-time' },
    amountFrom: { type: 'number', minimum: 0 },
    amountTo: { type: 'number', minimum: 0 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    isArchived: { type: 'boolean' },
    isRecurring: { type: 'boolean' },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    sortBy: { type: 'string', enum: ['date', 'amount', 'title', 'createdAt'] },
    sortOrder: { type: 'string', enum: ['asc', 'desc'] }
  }
};

export const exchangeRateSchema = {
  type: 'object',
  required: ['fromCurrency', 'toCurrency'],
  properties: {
    fromCurrency: { type: 'string', minLength: 3, maxLength: 3 },
    toCurrency: { type: 'string', minLength: 3, maxLength: 3 },
    forceRefresh: { type: 'boolean' }
  }
};

export const createExpenseTemplateSchema = {
  type: 'object',
  required: ['name', 'amount', 'groupId', 'splitType', 'splits', 'payers'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    amount: { type: 'number', minimum: 0.01 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    groupId: { type: 'string' },
    categoryId: { type: 'string' },
    isRecurring: { type: 'boolean' },
    recurringPattern: { type: 'string', enum: Object.values(RecurringPattern) },
    nextRecurringDate: { type: 'string', format: 'date-time' },
    splitType: { type: 'string', enum: Object.values(SplitType) },
    splits: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
          percentage: { type: 'number', minimum: 0, maximum: 100 },
          shares: { type: 'integer', minimum: 1 }
        }
      }
    },
    payers: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['userId', 'amount'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 0.01 }
        }
      }
    },
    tagNames: {
      type: 'array',
      items: { type: 'string', maxLength: 50 }
    }
  }
};

export const updateExpenseTemplateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    amount: { type: 'number', minimum: 0.01 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    categoryId: { type: 'string' },
    isRecurring: { type: 'boolean' },
    recurringPattern: { type: 'string', enum: Object.values(RecurringPattern) },
    nextRecurringDate: { type: 'string', format: 'date-time' },
    splitType: { type: 'string', enum: Object.values(SplitType) },
    splits: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
          percentage: { type: 'number', minimum: 0, maximum: 100 },
          shares: { type: 'integer', minimum: 1 }
        }
      }
    },
    payers: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['userId', 'amount'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'number', minimum: 0.01 }
        }
      }
    },
    tagNames: {
      type: 'array',
      items: { type: 'string', maxLength: 50 }
    }
  }
}; 