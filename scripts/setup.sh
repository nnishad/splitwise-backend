#!/bin/bash

echo "🚀 Setting up Splitwise Backend API..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database Configuration
# Replace with your PostgreSQL connection string
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/splitwise_db?schema=public"

# Test Database (optional)
TEST_DATABASE_URL="postgresql://test:test@localhost:5432/test_db?schema=public"

# Server Configuration
PORT=3000
NODE_ENV=development
EOF
    echo "✅ .env file created! Please update the DATABASE_URL with your PostgreSQL credentials."
else
    echo "✅ .env file already exists."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the DATABASE_URL in .env with your PostgreSQL credentials"
echo "2. Run 'npm run db:push' to create the database tables"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "📚 API Documentation will be available at: http://localhost:3000/documentation" 