import { PrismaClient } from '@prisma/client';
import { ExportType, ExportStatus, ExportRequest, GetExportStatusRequest } from '../types/audit';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

export class AuditExportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create an export job
   */
  async createExport(
    userId: string,
    request: ExportRequest
  ): Promise<{ exportId: string; status: ExportStatus }> {
    const { exportType, filters, format = 'detailed' } = request;

    // Create export record
    const exportRecord = await this.prisma.auditExport.create({
      data: {
        userId,
        groupId: filters?.groupId,
        exportType,
        filters: filters || {},
        status: ExportStatus.PENDING
      }
    });

    // Start export processing in background
    this.processExport(exportRecord.id).catch(error => {
      console.error('Export processing failed:', error);
      this.updateExportStatus(exportRecord.id, ExportStatus.FAILED);
    });

    return {
      exportId: exportRecord.id,
      status: exportRecord.status
    };
  }

  /**
   * Get export status
   */
  async getExportStatus(
    exportId: string,
    userId: string
  ): Promise<GetExportStatusRequest['data']> {
    const exportRecord = await this.prisma.auditExport.findUnique({
      where: { id: exportId }
    });

    if (!exportRecord) {
      throw new Error('Export not found');
    }

    // Verify user owns this export or has access to the group
    if (exportRecord.userId !== userId) {
      if (exportRecord.groupId) {
        const groupMember = await this.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: exportRecord.groupId,
              userId
            }
          }
        });

        if (!groupMember) {
          throw new Error('Access denied');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    return {
      exportId: exportRecord.id,
      status: exportRecord.status as ExportStatus,
      fileUrl: exportRecord.fileUrl || undefined,
      fileSize: exportRecord.fileSize || undefined,
      expiresAt: exportRecord.expiresAt.toISOString(),
      createdAt: exportRecord.createdAt.toISOString(),
      completedAt: exportRecord.completedAt?.toISOString()
    };
  }

  /**
   * Process export in background
   */
  private async processExport(exportId: string): Promise<void> {
    try {
      // Update status to processing
      await this.updateExportStatus(exportId, ExportStatus.PROCESSING);

      const exportRecord = await this.prisma.auditExport.findUnique({
        where: { id: exportId }
      });

      if (!exportRecord) {
        throw new Error('Export record not found');
      }

      // Get audit data based on filters
      const auditData = await this.getAuditDataForExport(exportRecord.filters as any);

      // Generate file based on export type
      let filePath: string;
      let fileSize: number;

      switch (exportRecord.exportType) {
        case ExportType.CSV:
          filePath = await this.generateCSVExport(exportId, auditData, exportRecord.filters as any);
          break;
        case ExportType.PDF:
          filePath = await this.generatePDFExport(exportId, auditData, exportRecord.filters as any);
          break;
        case ExportType.JSON:
          filePath = await this.generateJSONExport(exportId, auditData, exportRecord.filters as any);
          break;
        default:
          throw new Error('Unsupported export type');
      }

      // Get file size
      const stats = await promisify(fs.stat)(filePath);
      fileSize = stats.size;

      // Update export record with file info
      await this.prisma.auditExport.update({
        where: { id: exportId },
        data: {
          status: ExportStatus.COMPLETED,
          fileUrl: `/exports/${path.basename(filePath)}`,
          fileSize,
          completedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Export processing failed:', error);
      await this.updateExportStatus(exportId, ExportStatus.FAILED);
      throw error;
    }
  }

  /**
   * Get audit data for export
   */
  private async getAuditDataForExport(filters: any): Promise<any[]> {
    const where: any = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.groupId) where.groupId = filters.groupId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return logs;
  }

  /**
   * Generate CSV export
   */
  private async generateCSVExport(
    exportId: string,
    auditData: any[],
    filters: any
  ): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports');
    await mkdirAsync(exportDir, { recursive: true });

    const fileName = `audit_export_${exportId}_${Date.now()}.csv`;
    const filePath = path.join(exportDir, fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'entityType', title: 'Entity Type' },
        { id: 'entityId', title: 'Entity ID' },
        { id: 'action', title: 'Action' },
        { id: 'userId', title: 'User ID' },
        { id: 'userName', title: 'User Name' },
        { id: 'userEmail', title: 'User Email' },
        { id: 'groupId', title: 'Group ID' },
        { id: 'groupName', title: 'Group Name' },
        { id: 'version', title: 'Version' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'oldData', title: 'Old Data' },
        { id: 'newData', title: 'New Data' },
        { id: 'metadata', title: 'Metadata' }
      ]
    });

    const records = auditData.map(log => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      userId: log.userId,
      userName: log.user.name,
      userEmail: log.user.email,
      groupId: log.groupId || '',
      groupName: log.group?.name || '',
      version: log.version,
      createdAt: log.createdAt.toISOString(),
      oldData: log.oldData ? JSON.stringify(log.oldData) : '',
      newData: log.newData ? JSON.stringify(log.newData) : '',
      metadata: log.metadata ? JSON.stringify(log.metadata) : ''
    }));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  /**
   * Generate PDF export
   */
  private async generatePDFExport(
    exportId: string,
    auditData: any[],
    filters: any
  ): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports');
    await mkdirAsync(exportDir, { recursive: true });

    const fileName = `audit_export_${exportId}_${Date.now()}.pdf`;
    const filePath = path.join(exportDir, fileName);

    // For now, we'll create a simple text-based PDF
    // In a real implementation, you'd use a library like puppeteer or jsPDF
    const pdfContent = this.generatePDFContent(auditData, filters);
    
    // This is a placeholder - in a real implementation, you'd use a PDF library
    await writeFileAsync(filePath, pdfContent);

    return filePath;
  }

  /**
   * Generate JSON export
   */
  private async generateJSONExport(
    exportId: string,
    auditData: any[],
    filters: any
  ): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports');
    await mkdirAsync(exportDir, { recursive: true });

    const fileName = `audit_export_${exportId}_${Date.now()}.json`;
    const filePath = path.join(exportDir, fileName);

    const exportData = {
      exportInfo: {
        exportId,
        filters,
        generatedAt: new Date().toISOString(),
        totalRecords: auditData.length
      },
      data: auditData
    };

    await writeFileAsync(filePath, JSON.stringify(exportData, null, 2));
    return filePath;
  }

  /**
   * Generate PDF content (placeholder)
   */
  private generatePDFContent(auditData: any[], filters: any): string {
    // This is a placeholder implementation
    // In a real implementation, you'd use a proper PDF library
    let content = 'Audit Trail Export\n';
    content += '==================\n\n';
    content += `Generated: ${new Date().toISOString()}\n`;
    content += `Total Records: ${auditData.length}\n\n`;

    auditData.forEach((log, index) => {
      content += `Record ${index + 1}:\n`;
      content += `  ID: ${log.id}\n`;
      content += `  Entity Type: ${log.entityType}\n`;
      content += `  Entity ID: ${log.entityId}\n`;
      content += `  Action: ${log.action}\n`;
      content += `  User: ${log.user.name}\n`;
      content += `  Created: ${log.createdAt.toISOString()}\n`;
      content += `  Version: ${log.version}\n\n`;
    });

    return content;
  }

  /**
   * Update export status
   */
  private async updateExportStatus(exportId: string, status: ExportStatus): Promise<void> {
    await this.prisma.auditExport.update({
      where: { id: exportId },
      data: { status }
    });
  }

  /**
   * Clean up expired exports
   */
  async cleanupExpiredExports(): Promise<number> {
    const expiredExports = await this.prisma.auditExport.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    let deletedCount = 0;

    for (const exportRecord of expiredExports) {
      try {
        // Delete file if it exists
        if (exportRecord.fileUrl) {
          const filePath = path.join(process.cwd(), 'exports', path.basename(exportRecord.fileUrl));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        // Delete database record
        await this.prisma.auditExport.delete({
          where: { id: exportRecord.id }
        });

        deletedCount++;
      } catch (error) {
        console.error(`Failed to cleanup export ${exportRecord.id}:`, error);
      }
    }

    return deletedCount;
  }
} 