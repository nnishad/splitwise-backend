import { FastifySchema } from 'fastify';

// Audit Action Types
export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  REVERTED = 'reverted',
  RESTORED = 'restored',
  ARCHIVED = 'archived',
  SPLIT_CHANGED = 'split_changed',
  PAYER_CHANGED = 'payer_changed',
  CATEGORY_CHANGED = 'category_changed',
  TAGS_CHANGED = 'tags_changed',
  SETTLEMENT_CREATED = 'settlement_created',
  SETTLEMENT_COMPLETED = 'settlement_completed',
  SETTLEMENT_CANCELLED = 'settlement_cancelled'
}

export enum EntityType {
  EXPENSE = 'expense',
  SETTLEMENT = 'settlement',
  GROUP = 'group',
  USER = 'user'
}

export enum ExportType {
  CSV = 'csv',
  PDF = 'pdf',
  JSON = 'json'
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Request/Response Types
export interface GetAuditHistoryRequest {
  entityType?: EntityType;
  entityId?: string;
  groupId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface GetAuditHistoryResponse {
  success: boolean;
  data: {
    logs: AuditLogEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface AuditLogEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  userId: string;
  userName: string;
  groupId?: string;
  groupName?: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
  version: number;
  createdAt: string;
}

export interface RevertExpenseRequest {
  versionId: string;
  reason?: string;
}

export interface RevertExpenseResponse {
  success: boolean;
  data: {
    expense: any;
    revertedFrom: AuditLogEntry;
  };
}

export interface GetExpenseVersionsRequest {
  expenseId: string;
  page?: number;
  limit?: number;
}

export interface GetExpenseVersionsResponse {
  success: boolean;
  data: {
    versions: AuditLogEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface TransactionHistoryRequest {
  groupId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  page?: number;
  limit?: number;
}

export interface SpendingSummaryRequest {
  groupId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface SpendingSummaryResponse {
  success: boolean;
  data: {
    summaries: SpendingSummary[];
    totalAmount: number;
    totalCount: number;
  };
}

export interface SpendingSummary {
  period: string;
  amount: number;
  count: number;
  currency: string;
  categoryBreakdown?: CategoryBreakdown[];
  userBreakdown?: UserBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface UserBreakdown {
  userId: string;
  userName: string;
  amount: number;
  percentage: number;
}

export interface VisualizationRequest {
  groupId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  chartType: 'pie' | 'bar' | 'line' | 'heatmap';
  breakdownBy: 'category' | 'user' | 'time' | 'currency';
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface VisualizationResponse {
  success: boolean;
  data: {
    chartType: string;
    breakdownBy: string;
    labels: string[];
    datasets: ChartDataset[];
    totalAmount: number;
  };
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string[];
  borderColor?: string[];
  borderWidth?: number;
}

export interface ExportRequest {
  exportType: ExportType;
  filters?: {
    entityType?: EntityType;
    entityId?: string;
    groupId?: string;
    userId?: string;
    action?: AuditAction;
    startDate?: string;
    endDate?: string;
  };
  format?: 'detailed' | 'summary';
}

export interface ExportResponse {
  success: boolean;
  data: {
    exportId: string;
    status: ExportStatus;
    estimatedCompletion?: string;
  };
}

export interface GetExportStatusRequest {
  exportId: string;
}

export interface GetExportStatusResponse {
  success: boolean;
  data: {
    exportId: string;
    status: ExportStatus;
    fileUrl?: string;
    fileSize?: number;
    expiresAt: string;
    createdAt: string;
    completedAt?: string;
  };
}

// Schema Definitions
export const getAuditHistorySchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      entityType: { type: 'string', enum: Object.values(EntityType) },
      entityId: { type: 'string' },
      groupId: { type: 'string' },
      userId: { type: 'string' },
      action: { type: 'string', enum: Object.values(AuditAction) },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
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
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  entityType: { type: 'string' },
                  entityId: { type: 'string' },
                  action: { type: 'string' },
                  userId: { type: 'string' },
                  userName: { type: 'string' },
                  groupId: { type: 'string' },
                  groupName: { type: 'string' },
                  oldData: { type: 'object' },
                  newData: { type: 'object' },
                  metadata: { type: 'object' },
                  version: { type: 'integer' },
                  createdAt: { type: 'string' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }
};

export const revertExpenseSchema: FastifySchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      versionId: { type: 'string' }
    },
    required: ['id', 'versionId']
  },
  body: {
    type: 'object',
    properties: {
      reason: { type: 'string', maxLength: 500 }
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
            expense: { type: 'object' },
            revertedFrom: { type: 'object' }
          }
        }
      }
    }
  }
};

export const exportRequestSchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      exportType: { type: 'string', enum: Object.values(ExportType) },
      filters: {
        type: 'object',
        properties: {
          entityType: { type: 'string', enum: Object.values(EntityType) },
          entityId: { type: 'string' },
          groupId: { type: 'string' },
          userId: { type: 'string' },
          action: { type: 'string', enum: Object.values(AuditAction) },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' }
        }
      },
      format: { type: 'string', enum: ['detailed', 'summary'], default: 'detailed' }
    },
    required: ['exportType']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            exportId: { type: 'string' },
            status: { type: 'string' },
            estimatedCompletion: { type: 'string' }
          }
        }
      }
    }
  }
}; 