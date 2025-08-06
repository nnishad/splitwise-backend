# Enhanced Multi-Currency Splitwise API Examples

This document demonstrates the enhanced multi-currency functionality with Fixer.io integration, comprehensive currency support, and settlement features.

## Setup

### Environment Variables
```bash
# Fixer.io API (Free tier supports EUR base currency)
FIXER_API_KEY=your_fixer_api_key
FIXER_API_URL=http://data.fixer.io/api

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/splitwise_db"
```

## 1. Currency and Exchange Rate Operations

### Get All Supported Currencies (150+ currencies)
```bash
curl -X GET "http://localhost:3000/api/v1/currencies" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "precision": 2
    },
    {
      "code": "EUR",
      "name": "Euro",
      "symbol": "€",
      "precision": 2
    },
    {
      "code": "INR",
      "name": "Indian Rupee",
      "symbol": "₹",
      "precision": 2
    },
    {
      "code": "GBP",
      "name": "British Pound",
      "symbol": "£",
      "precision": 2
    },
    {
      "code": "JPY",
      "name": "Japanese Yen",
      "symbol": "¥",
      "precision": 0
    }
    // ... 150+ more currencies
  ]
}
```

### Get Exchange Rate
```bash
curl -X GET "http://localhost:3000/api/v1/exchange-rates?fromCurrency=USD&toCurrency=EUR" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fromCurrency": "USD",
    "toCurrency": "EUR",
    "rate": 0.85,
    "fetchedAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2024-01-15T11:30:00.000Z"
  }
}
```

### Convert Amount Between Currencies
```bash
curl -X POST "http://localhost:3000/api/v1/convert" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "fromCurrency": "USD",
    "toCurrency": "INR"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "convertedAmount": 8300,
    "rate": 83.0,
    "displayAmount": "₹8300.00"
  }
}
```

## 2. Multi-Currency Expense Creation

### Create Expense in Different Currency
```bash
curl -X POST "http://localhost:3000/api/v1/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "group_123",
    "title": "Dinner in Tokyo",
    "description": "Sushi dinner",
    "amount": 15000,
    "currency": "JPY",
    "date": "2024-01-15",
    "location": "Tokyo, Japan",
    "payers": [
      {
        "userId": "user_1",
        "amount": 15000
      }
    ],
    "splits": [
      {
        "userId": "user_1",
        "amount": 7500
      },
      {
        "userId": "user_2",
        "amount": 7500
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "expense_456",
    "title": "Dinner in Tokyo",
    "description": "Sushi dinner",
    "amount": 15000,
    "currency": "JPY",
    "displayAmount": "¥15000",
    "exchangeRate": 0.0067,
    "originalCurrency": "JPY",
    "convertedAmount": 100.5,
    "displayConvertedAmount": "$100.50",
    "date": "2024-01-15T00:00:00.000Z",
    "location": "Tokyo, Japan",
    "group": {
      "id": "group_123",
      "name": "Tokyo Trip",
      "defaultCurrency": "USD"
    },
    "createdBy": {
      "id": "user_1",
      "name": "Alice",
      "avatar": "https://example.com/avatar1.jpg"
    },
    "payers": [
      {
        "userId": "user_1",
        "amount": 15000,
        "user": {
          "id": "user_1",
          "name": "Alice",
          "avatar": "https://example.com/avatar1.jpg"
        }
      }
    ],
    "splits": [
      {
        "userId": "user_1",
        "amount": 7500,
        "user": {
          "id": "user_1",
          "name": "Alice",
          "avatar": "https://example.com/avatar1.jpg"
        }
      },
      {
        "userId": "user_2",
        "amount": 7500,
        "user": {
          "id": "user_2",
          "name": "Bob",
          "avatar": "https://example.com/avatar2.jpg"
        }
      }
    ]
  }
}
```

### Create Expense with Custom Exchange Rate Override
```bash
curl -X POST "http://localhost:3000/api/v1/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "group_123",
    "title": "Hotel in London",
    "description": "Hotel booking",
    "amount": 200,
    "currency": "GBP",
    "exchangeRateOverride": 1.25,
    "date": "2024-01-15",
    "payers": [
      {
        "userId": "user_1",
        "amount": 200
      }
    ],
    "splits": [
      {
        "userId": "user_1",
        "amount": 100
      },
      {
        "userId": "user_2",
        "amount": 100
      }
    ]
  }'
```

## 3. Multi-Currency Balance Management

### Get Group Balances (Multi-Currency)
```bash
curl -X GET "http://localhost:3000/api/v1/groups/group_123/balances?displayCurrency=USD" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user_1",
      "userName": "Alice",
      "balances": [
        {
          "currency": "USD",
          "amount": 50.25,
          "displayAmount": "$50.25",
          "convertedAmount": 50.25,
          "displayConvertedAmount": "$50.25"
        },
        {
          "currency": "INR",
          "amount": -4150,
          "displayAmount": "₹-4150.00",
          "convertedAmount": -50,
          "displayConvertedAmount": "$-50.00"
        },
        {
          "currency": "GBP",
          "amount": 40,
          "displayAmount": "£40.00",
          "convertedAmount": 50,
          "displayConvertedAmount": "$50.00"
        }
      ],
      "totalBalance": 50.25,
      "displayCurrency": "USD"
    },
    {
      "userId": "user_2",
      "userName": "Bob",
      "balances": [
        {
          "currency": "JPY",
          "amount": -7500,
          "displayAmount": "¥-7500",
          "convertedAmount": -50.25,
          "displayConvertedAmount": "$-50.25"
        }
      ],
      "totalBalance": -50.25,
      "displayCurrency": "USD"
    }
  ]
}
```

### Get Simplified Debt Structure
```bash
curl -X GET "http://localhost:3000/api/v1/groups/group_123/debts?displayCurrency=USD" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "fromUserId": "user_2",
      "fromUserName": "Bob",
      "toUserId": "user_1",
      "toUserName": "Alice",
      "amount": 50.25,
      "currency": "USD",
      "displayAmount": "$50.25"
    }
  ]
}
```

## 4. Settlement Management

### Create Settlement
```bash
curl -X POST "http://localhost:3000/api/v1/groups/group_123/settlements" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": "user_2",
    "toUserId": "user_1",
    "amount": 50.25,
    "currency": "USD",
    "notes": "Settling dinner expenses"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "settlement_789",
    "groupId": "group_123",
    "fromUserId": "user_2",
    "toUserId": "user_1",
    "amount": 50.25,
    "currency": "USD",
    "exchangeRate": null,
    "originalCurrency": null,
    "convertedAmount": null,
    "notes": "Settling dinner expenses",
    "status": "PENDING",
    "settledAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "fromUser": {
      "id": "user_2",
      "name": "Bob"
    },
    "toUser": {
      "id": "user_1",
      "name": "Alice"
    }
  }
}
```

### Complete Settlement
```bash
curl -X POST "http://localhost:3000/api/v1/groups/group_123/settlements/settlement_789/complete" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Settlement History
```bash
curl -X GET "http://localhost:3000/api/v1/groups/group_123/settlements?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 5. Advanced Multi-Currency Scenarios

### Scenario 1: International Trip with Multiple Currencies

**Expenses:**
1. Flight tickets in USD
2. Hotel in EUR
3. Food in local currency (JPY)
4. Transportation in local currency (JPY)

```bash
# Flight tickets
curl -X POST "http://localhost:3000/api/v1/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "trip_group",
    "title": "Flight to Tokyo",
    "amount": 1200,
    "currency": "USD",
    "payers": [{"userId": "user_1", "amount": 1200}],
    "splits": [
      {"userId": "user_1", "amount": 600},
      {"userId": "user_2", "amount": 600}
    ]
  }'

# Hotel booking
curl -X POST "http://localhost:3000/api/v1/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "trip_group",
    "title": "Hotel in Tokyo",
    "amount": 400,
    "currency": "EUR",
    "payers": [{"userId": "user_2", "amount": 400}],
    "splits": [
      {"userId": "user_1", "amount": 200},
      {"userId": "user_2", "amount": 200}
    ]
  }'

# Local expenses
curl -X POST "http://localhost:3000/api/v1/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "trip_group",
    "title": "Dinner in Tokyo",
    "amount": 15000,
    "currency": "JPY",
    "payers": [{"userId": "user_1", "amount": 15000}],
    "splits": [
      {"userId": "user_1", "amount": 7500},
      {"userId": "user_2", "amount": 7500}
    ]
  }'
```

**Final Balance Summary:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user_1",
      "userName": "Alice",
      "balances": [
        {
          "currency": "USD",
          "amount": 600,
          "displayAmount": "$600.00"
        },
        {
          "currency": "EUR",
          "amount": -200,
          "displayAmount": "€-200.00"
        },
        {
          "currency": "JPY",
          "amount": 7500,
          "displayAmount": "¥7500"
        }
      ],
      "totalBalance": 400,
      "displayCurrency": "USD"
    },
    {
      "userId": "user_2",
      "userName": "Bob",
      "balances": [
        {
          "currency": "USD",
          "amount": -600,
          "displayAmount": "$-600.00"
        },
        {
          "currency": "EUR",
          "amount": 200,
          "displayAmount": "€200.00"
        },
        {
          "currency": "JPY",
          "amount": -7500,
          "displayAmount": "¥-7500"
        }
      ],
      "totalBalance": -400,
      "displayCurrency": "USD"
    }
  ]
}
```

### Scenario 2: Cross-Currency Settlement

```bash
# Create settlement in different currency
curl -X POST "http://localhost:3000/api/v1/groups/trip_group/settlements" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": "user_2",
    "toUserId": "user_1",
    "amount": 400,
    "currency": "USD",
    "exchangeRateOverride": 1.0,
    "notes": "Settling trip expenses in USD"
  }'
```

## 6. Error Handling Examples

### Invalid Currency
```bash
curl -X POST "http://localhost:3000/api/v1/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "group_123",
    "title": "Test Expense",
    "amount": 100,
    "currency": "INVALID"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid currency: INVALID"
}
```

### Exchange Rate API Failure
When the Fixer.io API is unavailable, the system falls back to the last known rate:

```json
{
  "success": true,
  "data": {
    "id": "expense_456",
    "title": "Dinner in Tokyo",
    "amount": 15000,
    "currency": "JPY",
    "exchangeRate": 0.0067,
    "originalCurrency": "JPY",
    "convertedAmount": 100.5,
    "displayConvertedAmount": "$100.50",
    "note": "Using last known exchange rate due to API unavailability"
  }
}
```

## 7. Currency Precision Examples

### USD (2 decimal places)
```json
{
  "amount": 100.50,
  "currency": "USD",
  "displayAmount": "$100.50"
}
```

### JPY (0 decimal places)
```json
{
  "amount": 15000,
  "currency": "JPY",
  "displayAmount": "¥15000"
}
```

### INR (2 decimal places)
```json
{
  "amount": 8300.00,
  "currency": "INR",
  "displayAmount": "₹8300.00"
}
```

## 8. Cache Management

### Clear Expired Exchange Rates
```bash
curl -X POST "http://localhost:3000/api/v1/exchange-rates/clear-expired" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clearedCount": 5,
    "message": "Cleared 5 expired exchange rates"
  }
}
```

## Key Features Demonstrated

1. **Comprehensive Currency Support**: 150+ currencies with proper symbols and precision
2. **Fixer.io Integration**: Real-time exchange rates with intelligent caching
3. **FX Rate Override**: Any user involved in a transaction can override exchange rates
4. **Multi-Currency Balances**: Show balances in each currency with conversions
5. **Settlement Management**: Create, complete, and track settlements
6. **Error Handling**: Graceful fallback when exchange rate APIs fail
7. **Currency Precision**: Proper formatting for different currency types
8. **Cache Management**: Automatic cleanup of expired exchange rates

This enhanced multi-currency system provides a robust foundation for international expense tracking and settlement management. 