# Multi-Currency API Examples

This document demonstrates how to use the multi-currency features in the Splitwise Backend API.

## Setup

First, ensure you have the API running and have created a user and group:

```bash
# Start the server
npm run dev

# The API will be available at http://localhost:3000
```

## 1. Get Supported Currencies

```bash
curl -X GET "http://localhost:3000/api/v1/currencies" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
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
      "code": "JPY",
      "name": "Japanese Yen",
      "symbol": "¥",
      "precision": 0
    }
    // ... more currencies
  ]
}
```

## 2. Get Exchange Rate

```bash
curl -X GET "http://localhost:3000/api/v1/exchange-rates?fromCurrency=USD&toCurrency=EUR" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "fromCurrency": "USD",
    "toCurrency": "EUR",
    "rate": 0.85,
    "fetchedAt": "2025-08-06T01:30:00.000Z",
    "expiresAt": "2025-08-06T02:30:00.000Z"
  }
}
```

## 3. Convert Amount Between Currencies

```bash
curl -X POST "http://localhost:3000/api/v1/convert" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "fromCurrency": "USD",
    "toCurrency": "EUR"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "originalAmount": 100,
    "convertedAmount": 85,
    "fromCurrency": "USD",
    "toCurrency": "EUR",
    "rate": 0.85,
    "displayOriginal": "$100.00",
    "displayConverted": "€85.00"
  }
}
```

## 4. Create Multi-Currency Expense

### Example 1: Expense in EUR (Group default is USD)

```bash
curl -X POST "http://localhost:3000/api/v1/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dinner in Paris",
    "amount": 75.50,
    "currency": "EUR",
    "groupId": "your-group-id",
    "splitType": "EQUAL",
    "splits": [
      { "userId": "user1" },
      { "userId": "user2" }
    ],
    "payers": [
      { "userId": "user1", "amount": 75.50 }
    ]
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "expense-id",
    "title": "Dinner in Paris",
    "amount": 75.5,
    "currency": "EUR",
    "exchangeRate": 0.85,
    "originalCurrency": "EUR",
    "convertedAmount": 64.18,
    "displayAmount": "€75.50",
    "displayConvertedAmount": "$64.18",
    "date": "2025-08-06T01:30:00.000Z",
    "group": {
      "id": "group-id",
      "name": "Travel Group",
      "defaultCurrency": "USD"
    },
    "createdBy": {
      "id": "user1",
      "name": "John Doe"
    },
    "splits": [
      {
        "id": "split1",
        "userId": "user1",
        "amount": 37.75,
        "user": { "id": "user1", "name": "John Doe" }
      },
      {
        "id": "split2",
        "userId": "user2",
        "amount": 37.75,
        "user": { "id": "user2", "name": "Jane Smith" }
      }
    ],
    "payers": [
      {
        "id": "payer1",
        "userId": "user1",
        "amount": 75.5,
        "user": { "id": "user1", "name": "John Doe" }
      }
    ],
    "totalPaid": 75.5,
    "totalSplit": 75.5,
    "balance": 0
  }
}
```

### Example 2: Expense with Custom Exchange Rate

```bash
curl -X POST "http://localhost:3000/api/v1/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hotel in Tokyo",
    "amount": 15000,
    "currency": "JPY",
    "exchangeRateOverride": 0.0067,
    "groupId": "your-group-id",
    "splitType": "EQUAL",
    "splits": [
      { "userId": "user1" },
      { "userId": "user2" }
    ],
    "payers": [
      { "userId": "user1", "amount": 15000 }
    ]
  }'
```

## 5. Search Expenses by Currency

```bash
curl -X GET "http://localhost:3000/api/v1/expenses?currency=EUR&groupId=your-group-id" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 6. Override Exchange Rate (Admin/Owner Only)

```bash
curl -X POST "http://localhost:3000/api/v1/expenses/expense-id/exchange-rate-override" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exchangeRate": 0.90
  }'
```

## 7. Update User's Preferred Currency

```bash
curl -X PUT "http://localhost:3000/api/v1/users/user-id" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferredCurrency": "EUR"
  }'
```

## Key Features Demonstrated

1. **Multi-Currency Support**: Expenses can be created in any supported currency
2. **Automatic Conversion**: Expenses are automatically converted to the group's default currency
3. **Rate Locking**: Exchange rates are locked at expense creation and never recalculated
4. **Display Formatting**: Amounts are properly formatted with currency symbols
5. **Rate Override**: Admins can override exchange rates for specific expenses
6. **Currency Filtering**: Search expenses by currency
7. **User Preferences**: Users can set their preferred display currency

## Currency Precision Examples

- **USD/EUR**: 2 decimal places (e.g., $12.34, €45.67)
- **JPY**: 0 decimal places (e.g., ¥1234)
- **HUF**: 0 decimal places (e.g., Ft1234)

## Error Handling

The API includes comprehensive error handling for:
- Invalid currency codes
- Exchange rate API failures
- Permission checks for rate overrides
- Currency validation

## Testing the Features

You can test these features using the provided test suite:

```bash
npm test -- --testPathPattern=exchangeRateService
```

This will run the exchange rate service tests to verify the functionality. 