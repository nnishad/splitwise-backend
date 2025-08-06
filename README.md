# Splitwise Backend API

A comprehensive expense splitting API built with Fastify, Prisma, and PostgreSQL. This API supports multi-currency expenses with real-time exchange rates, user preferences, and advanced expense management features.

## 🌟 Features

### Core Features
- **User Authentication & Authorization** - JWT-based authentication with session management
- **Group Management** - Create, join, and manage expense groups
- **Expense Management** - Create, update, and track expenses with detailed splits
- **Expense Templates** - Save and reuse common expense configurations
- **Categories & Tags** - Organize expenses with categories and custom tags
- **Comments & History** - Track changes and add comments to expenses

### 🪙 Multi-Currency Support
- **Multi-Currency Expenses** - Add expenses in any supported currency
- **Live Exchange Rates** - Real-time exchange rate fetching with caching
- **Rate Locking** - Exchange rates are locked at expense creation (never recalculated)
- **Currency Conversion** - Automatic conversion to group's default currency
- **Display Preferences** - User-selectable preferred display currency
- **Rate Override** - Admin/owner can override exchange rates for specific expenses
- **Currency Formatting** - Proper currency symbol and decimal place formatting

### Supported Currencies
- USD (US Dollar) - $, 2 decimals
- EUR (Euro) - €, 2 decimals
- GBP (British Pound) - £, 2 decimals
- JPY (Japanese Yen) - ¥, 0 decimals
- CAD (Canadian Dollar) - C$, 2 decimals
- AUD (Australian Dollar) - A$, 2 decimals
- CHF (Swiss Franc) - CHF, 2 decimals
- CNY (Chinese Yuan) - ¥, 2 decimals
- INR (Indian Rupee) - ₹, 2 decimals
- BRL (Brazilian Real) - R$, 2 decimals
- MXN (Mexican Peso) - $, 2 decimals
- KRW (South Korean Won) - ₩, 0 decimals
- SGD (Singapore Dollar) - S$, 2 decimals
- NZD (New Zealand Dollar) - NZ$, 2 decimals
- SEK (Swedish Krona) - kr, 2 decimals
- NOK (Norwegian Krone) - kr, 2 decimals
- DKK (Danish Krone) - kr, 2 decimals
- PLN (Polish Zloty) - zł, 2 decimals
- CZK (Czech Koruna) - Kč, 2 decimals
- HUF (Hungarian Forint) - Ft, 0 decimals

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd splitwise-backend
   ```

2. **Run the setup script**
   ```bash
   npm run setup
   ```

3. **Configure your database**
   Update the `.env` file with your PostgreSQL connection:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/splitwise_db"
   JWT_SECRET="your-jwt-secret"
   EXCHANGE_RATE_API_KEY="your-api-key" # Optional, uses free API by default
   EXCHANGE_RATE_API_URL="https://api.exchangerate-api.com/v4/latest"
   ```

4. **Create database tables**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

> 📖 **For detailed setup instructions, see [docs/FRESH_START.md](docs/FRESH_START.md)**

## 📚 API Documentation

### Authentication
All endpoints (except `/auth/login` and `/auth/register`) require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Multi-Currency Endpoints

### Balance & Settlement Endpoints

#### Group Balances
- `GET /api/v1/groups/:groupId/balances` - Get all user balances for a group
- `GET /api/v1/groups/:groupId/balances/:userId` - Get specific user's balance with debts and settlements

#### Debt Management
- `GET /api/v1/groups/:groupId/debts` - Get "who owes whom" breakdown
- `GET /api/v1/groups/:groupId/debts/simplified` - Get simplified debt structure (minimizes number of payments)

#### Settlement Management
- `POST /api/v1/groups/:groupId/settlements` - Create a new settlement
- `GET /api/v1/groups/:groupId/settlements/:settlementId` - Get settlement by ID
- `PUT /api/v1/groups/:groupId/settlements/:settlementId` - Update settlement
- `DELETE /api/v1/groups/:groupId/settlements/:settlementId` - Delete settlement
- `GET /api/v1/groups/:groupId/settlements` - Get settlement history with pagination
- `POST /api/v1/groups/:groupId/settlements/:settlementId/complete` - Mark settlement as completed
- `POST /api/v1/groups/:groupId/settlements/:settlementId/cancel` - Mark settlement as cancelled

#### Reminder Settings
- `GET /api/v1/groups/:groupId/reminder-settings` - Get user's reminder settings
- `PUT /api/v1/groups/:groupId/reminder-settings` - Update reminder settings
- `GET /api/v1/groups/:groupId/reminder-settings/all` - Get all reminder settings for a group (admin only)

#### Balance & Settlement Features
- **Multi-Currency Support** - All balances and settlements support multiple currencies
- **Debt Simplification** - Automatically simplifies debts to minimize number of payments required
- **Settlement Tracking** - Track settlement status (pending, completed, cancelled)
- **Reminder System** - Configurable reminder frequency (daily, weekly, off)
- **Currency Conversion** - Automatic conversion between currencies using live exchange rates
- **Settlement Notes** - Add notes to settlements for record-keeping
- **Partial Settlements** - Support for partial debt settlements
- **Balance History** - Track balance changes over time

#### Get Supported Currencies
```http
GET /api/v1/currencies
```
Returns list of all supported currencies with their symbols and precision.

#### Get Exchange Rate
```http
GET /api/v1/exchange-rates?fromCurrency=USD&toCurrency=EUR&forceRefresh=false
```
Get current exchange rate between two currencies.

#### Convert Amount
```http
POST /api/v1/convert
Content-Type: application/json

{
  "amount": 100,
  "fromCurrency": "USD",
  "toCurrency": "EUR"
}
```
Convert an amount between currencies with formatted display.

#### Override Exchange Rate (Admin/Owner Only)
```http
POST /api/v1/expenses/{expenseId}/exchange-rate-override
Content-Type: application/json

{
  "exchangeRate": 0.85
}
```
Override exchange rate for a specific expense.

### Expense Endpoints

#### Create Multi-Currency Expense
```http
POST /api/v1/expenses
Content-Type: application/json

{
  "title": "Dinner",
  "amount": 50.00,
  "currency": "EUR",
  "exchangeRateOverride": 0.85, // Optional custom rate
  "groupId": "group-id",
  "splitType": "EQUAL",
  "splits": [
    { "userId": "user1" },
    { "userId": "user2" }
  ],
  "payers": [
    { "userId": "user1", "amount": 50.00 }
  ]
}
```

#### Get Expense with Currency Info
```http
GET /api/v1/expenses/{expenseId}
```
Returns expense with original and converted amounts, exchange rate, and formatted currency display.

#### Search Expenses by Currency
```http
GET /api/v1/expenses?currency=EUR&groupId=group-id
```
Filter expenses by currency.

### User Preferences

#### Update User's Preferred Currency
```http
PUT /api/v1/users/{userId}
Content-Type: application/json

{
  "preferredCurrency": "EUR"
}
```

## 🗄️ Database Schema

### Multi-Currency Tables

#### Expenses Table Updates
```sql
ALTER TABLE expenses ADD COLUMN exchange_rate DECIMAL(10,6);
ALTER TABLE expenses ADD COLUMN original_currency VARCHAR(3);
ALTER TABLE expenses ADD COLUMN converted_amount DECIMAL(10,2);
```

#### Exchange Rates Table
```sql
CREATE TABLE exchange_rates (
  id VARCHAR(255) PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  fetched_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(from_currency, to_currency)
);
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret for JWT token signing | Required |
| `EXCHANGE_RATE_API_KEY` | API key for exchange rate service | Optional |
| `EXCHANGE_RATE_API_URL` | Exchange rate API endpoint | `https://api.exchangerate-api.com/v4/latest` |
| `PORT` | Server port | `3000` |

### Exchange Rate API
The API uses the free ExchangeRate-API by default. For production use, consider:
- [Fixer.io](https://fixer.io/)
- [Open Exchange Rates](https://openexchangerates.org/)
- [Currency Layer](https://currencylayer.com/)

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run specific test files:
```bash
npm test -- --testPathPattern=exchangeRateService
```

## 📦 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run test suite |
| `npm run setup` | Set up database and create tables |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting (configurable)
- CORS protection
- SQL injection prevention via Prisma
- Exchange rate API error handling

## 🚀 Deployment

### Docker (Recommended)
```bash
docker build -t splitwise-backend .
docker run -p 3000:3000 splitwise-backend
```

### Manual Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run `npm run build`
4. Start with `npm start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check the API documentation at `/documentation`
- Review the test files for usage examples 