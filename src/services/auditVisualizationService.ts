import { PrismaClient } from '@prisma/client';
import { 
  VisualizationRequest, 
  VisualizationResponse, 
  SpendingSummaryRequest,
  SpendingSummaryResponse,
  SpendingSummary,
  CategoryBreakdown,
  UserBreakdown
} from '../types/audit';

export class AuditVisualizationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate visualization data for charts
   */
  async generateVisualization(
    request: VisualizationRequest,
    currentUserId: string
  ): Promise<VisualizationResponse> {
    const { groupId, userId, startDate, endDate, chartType, breakdownBy, period } = request;

    // Verify user has access
    if (groupId) {
      const groupMember = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: currentUserId
          }
        }
      });

      if (!groupMember) {
        throw new Error('Access denied: User not a member of this group');
      }
    }

    // Build date range
    const dateRange = this.buildDateRange(startDate, endDate);

    // Get data based on chart type and breakdown
    let labels: string[] = [];
    let datasets: any[] = [];
    let totalAmount = 0;

    switch (breakdownBy) {
      case 'category':
        const categoryData = await this.getCategoryBreakdown(groupId, userId, dateRange);
        labels = categoryData.map(item => item.categoryName);
        datasets = [{
          label: 'Amount',
          data: categoryData.map(item => item.amount),
          backgroundColor: this.generateColors(categoryData.length),
          borderColor: this.generateColors(categoryData.length),
          borderWidth: 1
        }];
        totalAmount = categoryData.reduce((sum, item) => sum + item.amount, 0);
        break;

      case 'user':
        const userData = await this.getUserBreakdown(groupId, dateRange);
        labels = userData.map(item => item.userName);
        datasets = [{
          label: 'Amount',
          data: userData.map(item => item.amount),
          backgroundColor: this.generateColors(userData.length),
          borderColor: this.generateColors(userData.length),
          borderWidth: 1
        }];
        totalAmount = userData.reduce((sum, item) => sum + item.amount, 0);
        break;

      case 'time':
        const timeData = await this.getTimeBreakdown(groupId, userId, dateRange, period);
        labels = timeData.map(item => item.period);
        datasets = [{
          label: 'Amount',
          data: timeData.map(item => item.amount),
          backgroundColor: this.generateColors(timeData.length),
          borderColor: this.generateColors(timeData.length),
          borderWidth: 1
        }];
        totalAmount = timeData.reduce((sum, item) => sum + item.amount, 0);
        break;

      case 'currency':
        const currencyData = await this.getCurrencyBreakdown(groupId, userId, dateRange);
        labels = currencyData.map(item => item.currency);
        datasets = [{
          label: 'Amount',
          data: currencyData.map(item => item.amount),
          backgroundColor: this.generateColors(currencyData.length),
          borderColor: this.generateColors(currencyData.length),
          borderWidth: 1
        }];
        totalAmount = currencyData.reduce((sum, item) => sum + item.amount, 0);
        break;

      default:
        throw new Error('Unsupported breakdown type');
    }

    return {
      success: true,
      data: {
        chartType,
        breakdownBy,
        labels,
        datasets,
        totalAmount
      }
    };
  }

  /**
   * Get spending summary with breakdowns
   */
  async getSpendingSummary(
    request: SpendingSummaryRequest,
    currentUserId: string
  ): Promise<SpendingSummaryResponse> {
    const { groupId, userId, startDate, endDate, period } = request;

    // Verify user has access
    if (groupId) {
      const groupMember = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: currentUserId
          }
        }
      });

      if (!groupMember) {
        throw new Error('Access denied: User not a member of this group');
      }
    }

    const dateRange = this.buildDateRange(startDate, endDate);
    const summaries = await this.getPeriodSummaries(groupId, userId, dateRange, period);

    const totalAmount = summaries.reduce((sum, summary) => sum + summary.amount, 0);
    const totalCount = summaries.reduce((sum, summary) => sum + summary.count, 0);

    return {
      success: true,
      data: {
        summaries,
        totalAmount,
        totalCount
      }
    };
  }

  /**
   * Get category breakdown
   */
  private async getCategoryBreakdown(
    groupId?: string,
    userId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<CategoryBreakdown[]> {
    const where: any = {};

    if (groupId) where.groupId = groupId;
    if (userId) where.createdById = userId;
    if (dateRange) {
      where.date = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        category: true
      }
    });

    const categoryMap = new Map<string, { name: string; amount: number }>();

    expenses.forEach(expense => {
      const categoryName = expense.category?.name || 'Uncategorized';
      const current = categoryMap.get(categoryName) || { name: categoryName, amount: 0 };
      current.amount += Number(expense.amount);
      categoryMap.set(categoryName, current);
    });

    const total = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.amount, 0);

    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      categoryId: name,
      categoryName: name,
      amount: data.amount,
      percentage: total > 0 ? (data.amount / total) * 100 : 0
    }));
  }

  /**
   * Get user breakdown
   */
  private async getUserBreakdown(
    groupId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<UserBreakdown[]> {
    const where: any = {};

    if (groupId) where.groupId = groupId;
    if (dateRange) {
      where.date = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        createdBy: true
      }
    });

    const userMap = new Map<string, { name: string; amount: number }>();

    expenses.forEach(expense => {
      const userName = expense.createdBy.name;
      const current = userMap.get(userName) || { name: userName, amount: 0 };
      current.amount += Number(expense.amount);
      userMap.set(userName, current);
    });

    const total = Array.from(userMap.values()).reduce((sum, item) => sum + item.amount, 0);

    return Array.from(userMap.entries()).map(([name, data]) => ({
      userId: name,
      userName: name,
      amount: data.amount,
      percentage: total > 0 ? (data.amount / total) * 100 : 0
    }));
  }

  /**
   * Get time breakdown
   */
  private async getTimeBreakdown(
    groupId?: string,
    userId?: string,
    dateRange?: { start: Date; end: Date },
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<{ period: string; amount: number }[]> {
    const where: any = {};

    if (groupId) where.groupId = groupId;
    if (userId) where.createdById = userId;
    if (dateRange) {
      where.date = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      select: {
        date: true,
        amount: true
      }
    });

    const periodMap = new Map<string, number>();

    expenses.forEach(expense => {
      let periodKey: string;

      switch (period) {
        case 'daily':
          periodKey = expense.date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(expense.date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          periodKey = expense.date.getFullYear().toString();
          break;
        default:
          periodKey = expense.date.toISOString().split('T')[0];
      }

      const current = periodMap.get(periodKey) || 0;
      periodMap.set(periodKey, current + Number(expense.amount));
    });

    return Array.from(periodMap.entries())
      .map(([period, amount]) => ({ period, amount }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Get currency breakdown
   */
  private async getCurrencyBreakdown(
    groupId?: string,
    userId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{ currency: string; amount: number }[]> {
    const where: any = {};

    if (groupId) where.groupId = groupId;
    if (userId) where.createdById = userId;
    if (dateRange) {
      where.date = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      select: {
        currency: true,
        amount: true
      }
    });

    const currencyMap = new Map<string, number>();

    expenses.forEach(expense => {
      const current = currencyMap.get(expense.currency) || 0;
      currencyMap.set(expense.currency, current + Number(expense.amount));
    });

    return Array.from(currencyMap.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get period summaries
   */
  private async getPeriodSummaries(
    groupId?: string,
    userId?: string,
    dateRange?: { start: Date; end: Date },
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<SpendingSummary[]> {
    const timeBreakdown = await this.getTimeBreakdown(groupId, userId, dateRange, period);
    const categoryBreakdown = await this.getCategoryBreakdown(groupId, userId, dateRange);
    const userBreakdown = await this.getUserBreakdown(groupId, dateRange);

    return timeBreakdown.map(item => ({
      period: item.period,
      amount: item.amount,
      count: 0, // Would need to count expenses per period
      currency: 'USD', // Would need to get from expenses
      categoryBreakdown,
      userBreakdown
    }));
  }

  /**
   * Build date range from start and end dates
   */
  private buildDateRange(startDate?: string, endDate?: string): { start: Date; end: Date } | undefined {
    if (!startDate && !endDate) return undefined;

    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    return { start, end };
  }

  /**
   * Generate colors for charts
   */
  private generateColors(count: number): string[] {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
      '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
    ];

    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }

    return result;
  }
} 