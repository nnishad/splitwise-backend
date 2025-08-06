import { Decimal } from '@prisma/client/runtime/library';

// Enums
export enum SettlementStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum SettlementType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL'
}

export enum SettlementAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ReminderFrequency {
  OFF = 'OFF',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY'
}

// Base Types
export interface UserBalance {
  userId: string;
  userName: string;
  userAvatar?: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  currency: string;
  displayAmount: string;
}

export interface DebtBreakdown {
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  toUserId: string;
  toUserName: string;
  toUserAvatar?: string;
  amount: number;
  currency: string;
  displayAmount: string;
}

export interface SimplifiedDebt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
  displayAmount: string;
  originalDebts: string[]; // Array of debt IDs that were simplified
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  originalCurrency?: string;
  convertedAmount?: number;
  notes?: string;
  status: SettlementStatus;
  settlementType: SettlementType;
  partialAmount?: number;
  originalSplitId?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  group?: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
  fromUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  toUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  originalSplit?: {
    id: string;
    amount: number;
    settledAmount: number;
  };
}

export interface BalanceReminderSettings {
  id: string;
  groupId: string;
  userId: string;
  frequency: ReminderFrequency;
  lastReminderSent?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  group?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Request DTOs
export interface CreateSettlementRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency?: string; // Optional - defaults to group's default currency
  exchangeRateOverride?: number; // Optional - custom exchange rate
  notes?: string;
  settlementType?: SettlementType; // Defaults to FULL
  partialAmount?: number; // Required for PARTIAL settlements
  originalSplitId?: string; // Required for PARTIAL settlements
}

export interface UpdateSettlementRequest {
  amount?: number;
  currency?: string;
  exchangeRateOverride?: number;
  notes?: string;
  status?: SettlementStatus;
  partialAmount?: number;
  settlementType?: SettlementType;
}

export interface UpdateReminderSettingsRequest {
  frequency: ReminderFrequency;
}

export interface GetBalancesRequest {
  currency?: string; // Optional - convert all balances to this currency
  includeSettlements?: boolean; // Whether to include pending settlements in calculations
}

export interface GetDebtsRequest {
  currency?: string; // Optional - convert all debts to this currency
  includeSettlements?: boolean; // Whether to include pending settlements
  simplify?: boolean; // Whether to return simplified debt structure
}

// Response DTOs
export interface GroupBalancesResponse {
  groupId: string;
  groupName: string;
  defaultCurrency: string;
  balances: UserBalance[];
  totalGroupExpense: number;
  displayTotalAmount: string;
}

export interface UserBalanceResponse {
  userId: string;
  userName: string;
  userAvatar?: string;
  groupId: string;
  groupName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  currency: string;
  displayAmount: string;
  debts: DebtBreakdown[];
  settlements: Settlement[];
}

export interface DebtBreakdownResponse {
  groupId: string;
  groupName: string;
  debts: DebtBreakdown[];
  simplifiedDebts?: SimplifiedDebt[];
  totalDebtAmount: number;
  displayTotalAmount: string;
}

export interface SettlementResponse {
  id: string;
  groupId: string;
  groupName: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  toUserId: string;
  toUserName: string;
  toUserAvatar?: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  originalCurrency?: string;
  convertedAmount?: number;
  notes?: string;
  status: SettlementStatus;
  settlementType: SettlementType;
  partialAmount?: number;
  originalSplitId?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
  displayAmount: string;
}

export interface SettlementListResponse {
  settlements: SettlementResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReminderSettingsResponse {
  id: string;
  groupId: string;
  groupName: string;
  userId: string;
  userName: string;
  frequency: ReminderFrequency;
  lastReminderSent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementHistory {
  id: string;
  settlementId: string;
  action: SettlementAction;
  amount: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface RealTimeBalanceResponse {
  groupId: string;
  groupName: string;
  defaultCurrency: string;
  balances: UserBalance[];
  totalGroupExpense: number;
  displayTotalAmount: string;
  lastUpdated: string;
  settlements: Settlement[];
  debts: DebtBreakdown[];
}

// Validation Schemas
export const createSettlementSchema = {
  type: 'object',
  required: ['fromUserId', 'toUserId', 'amount'],
  properties: {
    fromUserId: { type: 'string' },
    toUserId: { type: 'string' },
    amount: { type: 'number', minimum: 0.01 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    exchangeRateOverride: { type: 'number', minimum: 0.000001 },
    notes: { type: 'string', maxLength: 1000 }
  }
};

export const updateSettlementSchema = {
  type: 'object',
  properties: {
    amount: { type: 'number', minimum: 0.01 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    exchangeRateOverride: { type: 'number', minimum: 0.000001 },
    notes: { type: 'string', maxLength: 1000 },
    status: { type: 'string', enum: Object.values(SettlementStatus) }
  }
};

export const updateReminderSettingsSchema = {
  type: 'object',
  required: ['frequency'],
  properties: {
    frequency: { type: 'string', enum: Object.values(ReminderFrequency) }
  }
};

export const getBalancesSchema = {
  type: 'object',
  properties: {
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    includeSettlements: { type: 'boolean' }
  }
};

export const getDebtsSchema = {
  type: 'object',
  properties: {
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    includeSettlements: { type: 'boolean' },
    simplify: { type: 'boolean' }
  }
}; 