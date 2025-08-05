# Splitwise Backend API

A comprehensive REST API for user management with JWT authentication, session management, and user blocking features.

## Features

- **User Authentication**: JWT-based authentication with 1-day token expiration
- **User Registration & Login**: Secure password hashing with bcrypt
- **Session Management**: Multiple concurrent sessions, view/revoke active sessions
- **User Profile Management**: Update name, avatar, preferred currency
- **Account Deletion**: Data anonymization on account removal
- **User Blocking**: Block/unblock users functionality
- **Password Management**: Change password, password reset (framework ready)
- **Security**: Input validation, secure token handling, data anonymization

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd splitwise-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/splitwise_db"
   
   # JWT Secret (change this in production!)
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   
   # Server
   PORT=3000
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The server will be available at `http://localhost:3000`

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": null,
      "preferredCurrency": "USD",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2025-08-05T23:57:59.830Z",
      "updatedAt": "2025-08-05T23:57:59.830Z"
    },
    "token": "jwt-token",
    "sessionId": "session-id"
  }
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register response

#### Request Password Reset
```http
POST /auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Confirm Password Reset
```http
POST /auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset-token",
  "newPassword": "newpassword123"
}
```

#### Change Password (Authenticated)
```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Logout Current Session
```http
POST /auth/logout
Authorization: Bearer <token>
```

#### Logout All Devices
```http
POST /auth/logout-all
Authorization: Bearer <token>
```

### User Management Endpoints

#### Get All Users
```http
GET /users
Authorization: Bearer <token>
```

#### Get User by ID
```http
GET /users/{id}
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /users/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "avatar": "https://example.com/avatar.jpg",
  "preferredCurrency": "EUR"
}
```

#### Delete User Account
```http
DELETE /users/{id}
Authorization: Bearer <token>
```

**Note:** This anonymizes user data instead of hard deletion.

### User Blocking Endpoints

#### Block User
```http
POST /users/{userId}/block
Authorization: Bearer <token>
```

#### Unblock User
```http
DELETE /users/{userId}/block
Authorization: Bearer <token>
```

#### Get Blocked Users
```http
GET /users/blocked
Authorization: Bearer <token>
```

### Session Management Endpoints

#### Get Active Sessions
```http
GET /sessions
Authorization: Bearer <token>
```

#### Revoke Specific Session
```http
DELETE /sessions/{sessionId}
Authorization: Bearer <token>
```

#### Revoke All Sessions
```http
DELETE /sessions
Authorization: Bearer <token>
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  avatar TEXT,
  preferredCurrency TEXT DEFAULT 'USD',
  isDeleted BOOLEAN DEFAULT false,
  deletedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  deviceInfo TEXT,
  ipAddress TEXT,
  isActive BOOLEAN DEFAULT true,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### User Blocks Table
```sql
CREATE TABLE user_blocks (
  id TEXT PRIMARY KEY,
  blockerId TEXT NOT NULL,
  blockedId TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(blockerId, blockedId),
  FOREIGN KEY (blockerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blockedId) REFERENCES users(id) ON DELETE CASCADE
);
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one letter
- At least one number

### JWT Token Security
- 1-day expiration time
- Session-based validation
- Automatic cleanup of expired sessions

### Data Protection
- Password hashing with bcrypt (12 salt rounds)
- Data anonymization on account deletion
- Input validation and sanitization

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode

# Setup
npm run setup        # Run setup script
```

### Project Structure

```
src/
├── middleware/          # Authentication middleware
├── plugins/            # Fastify plugins (Prisma, Swagger)
├── routes/             # API route handlers
│   ├── auth.ts        # Authentication routes
│   ├── users.ts       # User management routes
│   └── sessions.ts    # Session management routes
├── services/           # Business logic
│   ├── authService.ts # Authentication service
│   ├── userService.ts # User management service
│   └── sessionService.ts # Session management service
├── types/              # TypeScript type definitions
│   └── user.ts        # User-related types
├── utils/              # Utility functions
│   ├── auth.ts        # Authentication utilities
│   └── validation.ts  # Request validation schemas
└── server.ts          # Main server file
```

## Testing

Run the test suite:
```bash
npm test
```

## API Documentation

Interactive API documentation is available at:
```
http://localhost:3000/documentation
```

## Health Check

Check server status:
```bash
curl http://localhost:3000/health
```

## Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 