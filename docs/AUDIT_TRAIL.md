# Audit Trail & History API Documentation

## Overview

The Audit Trail & History system provides comprehensive tracking of all changes to expenses, settlements, groups, and users. It includes full changelog functionality, version management, export capabilities, and visualization features.

## Features

### Core Audit Functionality
- **Full Changelog**: Track who, what, when, before/after for all entity changes
- **Version Management**: View all historical versions of expenses
- **Revert/Restore**: Revert expenses to previous versions
- **Optimistic Locking**: Handle concurrent edits with version conflicts
- **Data Compression**: Efficient storage with gzip compression

### Reporting & Analytics
- **Transaction History**: Filterable complete transaction history
- **Spending Summaries**: Monthly/weekly summaries with breakdowns
- **Visualizations**: Pie/bar charts for spending analysis
- **Custom Date Ranges**: Flexible date filtering for reports

### Export Capabilities
- **CSV Export**: Detailed audit data in CSV format
- **PDF Export**: Formatted reports in PDF format
- **JSON Export**: Raw data export for integration
- **Background Processing**: Asynchronous export generation

### Data Management
- **5-Year Retention**: Audit trails kept for 5 years
- **Automatic Archival**: Old data compressed and archived after 1 year
- **Performance Optimization**: Indexed queries for large datasets
- **Cleanup Jobs**: Automatic cleanup of expired exports

## API Endpoints

### Audit History

#### GET /api/v1/audit/history
Get audit history with filtering and pagination.

**Query Parameters:**
- `entityType` (optional): Filter by entity type (`expense`, `settlement`, `group`, `user`)
- `entityId` (optional): Filter by specific entity ID
- `groupId` (optional): Filter by group
- `userId` (optional): Filter by user who performed action
- `action` (optional): Filter by action type
- `startDate` (optional): Start date for filtering (ISO string)
- `endDate` (optional): End date for filtering (ISO string)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "audit_log_id",
        "entityType": "expense",
        "entityId": "expense_id",
        "action": "created",
        "userId": "user_id",
        "userName": "John Doe",
        "groupId": "group_id",
        "groupName": "Trip to Paris",
        "oldData": null,
        "newData": {
          "title": "Dinner",
          "amount": 50.00,
          "currency": "USD"
        },
        "metadata": {
          "ipAddress": "192.168.1.1",
          "userAgent": "Mozilla/5.0..."
        },
        "version": 1,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Expense Audit Trail

#### GET /api/v1/audit/expenses/:id/history
Get audit history for a specific expense.

**Path Parameters:**
- `id`: Expense ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": "audit_log_id",
        "entityType": "expense",
        "entityId": "expense_id",
        "action": "created",
        "userId": "user_id",
        "userName": "John Doe",
        "oldData": null,
        "newData": {
          "title": "Dinner",
          "amount": 50.00
        },
        "version": 1,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### POST /api/v1/audit/expenses/:id/revert/:versionId
Revert an expense to a previous version.

**Path Parameters:**
- `id`: Expense ID
- `versionId`: Audit log ID to revert to

**Request Body:**
```json
{
  "reason": "Reverting due to incorrect amount"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "expense_id",
      "title": "Dinner",
      "amount": 50.00,
      "currency": "USD"
    },
    "revertedFrom": {
      "id": "audit_log_id",
      "version": 2,
      "createdAt": "2024-01-15T11:00:00Z"
    }
  }
}
```

### Group Audit Trail

#### GET /api/v1/audit/groups/:id/history
Get audit history for a specific group.

**Path Parameters:**
- `id`: Group ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

### Transaction History

#### GET /api/v1/audit/reports/transactions
Get transaction history with advanced filtering.

**Query Parameters:**
- `groupId` (optional): Filter by group
- `userId` (optional): Filter by user
- `startDate` (optional): Start date (ISO string)
- `endDate` (optional): End date (ISO string)
- `categoryId` (optional): Filter by category
- `minAmount` (optional): Minimum amount
- `maxAmount` (optional): Maximum amount
- `currency` (optional): Filter by currency
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

### Spending Summaries

#### GET /api/v1/audit/reports/summaries
Get spending summaries with breakdowns.

**Query Parameters:**
- `groupId` (optional): Filter by group
- `userId` (optional): Filter by user
- `startDate` (optional): Start date (ISO string)
- `endDate` (optional): End date (ISO string)
- `period` (required): Summary period (`daily`, `weekly`, `monthly`, `yearly`)

**Response:**
```json
{
  "success": true,
  "data": {
    "summaries": [
      {
        "period": "2024-01",
        "amount": 1250.00,
        "count": 15,
        "currency": "USD",
        "categoryBreakdown": [
          {
            "categoryId": "food",
            "categoryName": "Food & Dining",
            "amount": 500.00,
            "percentage": 40.0
          }
        ],
        "userBreakdown": [
          {
            "userId": "user_id",
            "userName": "John Doe",
            "amount": 600.00,
            "percentage": 48.0
          }
        ]
      }
    ],
    "totalAmount": 1250.00,
    "totalCount": 15
  }
}
```

### Visualizations

#### GET /api/v1/audit/reports/visualizations
Get chart data for visualizations.

**Query Parameters:**
- `groupId` (optional): Filter by group
- `userId` (optional): Filter by user
- `startDate` (optional): Start date (ISO string)
- `endDate` (optional): End date (ISO string)
- `chartType` (required): Chart type (`pie`, `bar`, `line`, `heatmap`)
- `breakdownBy` (required): Breakdown type (`category`, `user`, `time`, `currency`)
- `period` (optional): Time period for time breakdown (`daily`, `weekly`, `monthly`, `yearly`)

**Response:**
```json
{
  "success": true,
  "data": {
    "chartType": "pie",
    "breakdownBy": "category",
    "labels": ["Food & Dining", "Transportation", "Entertainment"],
    "datasets": [
      {
        "label": "Amount",
        "data": [500.00, 300.00, 200.00],
        "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"],
        "borderColor": ["#FF6384", "#36A2EB", "#FFCE56"],
        "borderWidth": 1
      }
    ],
    "totalAmount": 1000.00
  }
}
```

### Export Management

#### POST /api/v1/audit/exports
Create an export job.

**Request Body:**
```json
{
  "exportType": "csv",
  "filters": {
    "entityType": "expense",
    "groupId": "group_id",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z"
  },
  "format": "detailed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "export_id",
    "status": "pending",
    "estimatedCompletion": "2024-01-15T10:35:00Z"
  }
}
```

#### GET /api/v1/audit/exports/:id/status
Get export status and download link.

**Path Parameters:**
- `id`: Export ID

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "export_id",
    "status": "completed",
    "fileUrl": "/exports/audit_export_123_1705312200000.csv",
    "fileSize": 1024,
    "expiresAt": "2024-01-22T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:32:00Z"
  }
}
```

### Statistics

#### GET /api/v1/audit/groups/:id/statistics
Get audit statistics for a group.

**Path Parameters:**
- `id`: Group ID

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 150,
    "todayLogs": 5,
    "thisWeekLogs": 25,
    "thisMonthLogs": 100,
    "actionBreakdown": [
      {
        "action": "created",
        "count": 50
      },
      {
        "action": "updated",
        "count": 100
      }
    ],
    "userBreakdown": [
      {
        "userId": "user_id",
        "count": 75
      }
    ]
  }
}
```

## Authentication & Authorization

### Access Control
- **View Audit Trails**: All group members can view audit trails for their groups
- **Revert/Restore**: Only expense creators can revert their own expenses
- **Export**: All group members can export audit data for their groups
- **Statistics**: All group members can view statistics for their groups

### Permission Levels
1. **Group Member**: Can view audit trails and export data
2. **Expense Creator**: Can revert their own expenses
3. **Group Admin**: Can view all audit data for the group
4. **System Admin**: Can access all audit data and manage archival

## Data Retention & Performance

### Retention Policy
- **Active Audit Logs**: Kept for 1 year
- **Archived Audit Logs**: Kept for 5 years total
- **Export Files**: Automatically deleted after 7 days
- **Compression**: Old data compressed to save storage

### Performance Optimizations
- **Indexed Queries**: Optimized indexes for common queries
- **Pagination**: All list endpoints support pagination
- **Background Processing**: Exports processed asynchronously
- **Caching**: Frequently accessed data cached

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid parameters"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Access denied: User not a member of this group"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Expense not found"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "message": "Version conflict detected"
}
```

## Integration Examples

### Frontend Integration

```javascript
// Get audit history for an expense
const getExpenseHistory = async (expenseId) => {
  const response = await fetch(`/api/v1/audit/expenses/${expenseId}/history`);
  const data = await response.json();
  return data.data.versions;
};

// Revert expense to previous version
const revertExpense = async (expenseId, versionId, reason) => {
  const response = await fetch(`/api/v1/audit/expenses/${expenseId}/revert/${versionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  return await response.json();
};

// Get visualization data
const getVisualization = async (params) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`/api/v1/audit/reports/visualizations?${queryString}`);
  return await response.json();
};
```

### Chart.js Integration

```javascript
// Create pie chart from visualization data
const createPieChart = (visualizationData) => {
  const ctx = document.getElementById('spendingChart').getContext('2d');
  return new Chart(ctx, {
    type: visualizationData.data.chartType,
    data: {
      labels: visualizationData.data.labels,
      datasets: visualizationData.data.datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Spending Breakdown' }
      }
    }
  });
};
```

## Best Practices

### Performance
- Use pagination for large datasets
- Implement caching for frequently accessed data
- Use background jobs for heavy operations
- Monitor query performance with database indexes

### Security
- Validate all input parameters
- Implement rate limiting for export endpoints
- Log security-relevant audit events
- Sanitize data before storage

### Data Management
- Regularly run archival jobs
- Monitor storage usage
- Implement data retention policies
- Backup audit data regularly

## Troubleshooting

### Common Issues

**Export Timeout:**
- Large datasets may take time to process
- Check export status endpoint for progress
- Consider reducing date range or filters

**Memory Issues:**
- Use pagination for large result sets
- Implement streaming for large exports
- Monitor server memory usage

**Performance Issues:**
- Add database indexes for common queries
- Implement caching for repeated requests
- Consider data archival for old records

## Future Enhancements

### Planned Features
- Real-time audit notifications
- Advanced analytics and machine learning
- Integration with external audit systems
- Enhanced visualization options
- Mobile-optimized audit interface

### API Versioning
- Current version: v1
- Backward compatibility maintained
- New features added as optional parameters
- Deprecation notices provided in advance 