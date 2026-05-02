#!/bin/bash

# Database Migration Fix Script
# This script helps fix the missing authentication fields in the database

echo "🔧 Ndangira Database Migration Fix"
echo "=================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd backend && bash fix-database.sh"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "   Please copy .env.example to .env and configure DATABASE_URL"
    exit 1
fi

echo "📋 Step 1: Testing database connection..."
if npx prisma db pull --force 2>/dev/null; then
    echo "✅ Database connection successful!"
    echo ""
    
    echo "📋 Step 2: Running automatic migration..."
    if npx prisma migrate dev --name add_merchant_auth_fields; then
        echo "✅ Migration completed successfully!"
        echo ""
        
        echo "📋 Step 3: Regenerating Prisma Client..."
        npx prisma generate
        echo "✅ Prisma Client regenerated!"
        echo ""
        
        echo "🎉 Database migration completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Restart your backend server: npm run dev"
        echo "2. Test registration at http://localhost:5173"
        echo ""
    else
        echo "❌ Migration failed"
        echo ""
        echo "Please try manual migration:"
        echo "1. Go to your Supabase SQL Editor"
        echo "2. Run the SQL from: prisma/migrations/20260502_add_merchant_auth_fields.sql"
        echo "3. Then run: npx prisma generate"
        exit 1
    fi
else
    echo "⚠️  Cannot connect to database automatically"
    echo ""
    echo "This usually means you're using a remote database (like Supabase)."
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. Go to your Supabase Dashboard"
    echo "   → SQL Editor"
    echo ""
    echo "2. Copy and paste this SQL:"
    echo "   File: prisma/migrations/20260502_add_merchant_auth_fields.sql"
    echo ""
    echo "3. Run the query in Supabase"
    echo ""
    echo "4. Then run this command:"
    echo "   npx prisma generate"
    echo ""
    echo "5. Restart your backend:"
    echo "   npm run dev"
    echo ""
    
    # Show the SQL file location
    if [ -f "prisma/migrations/20260502_add_merchant_auth_fields.sql" ]; then
        echo "📄 SQL file location:"
        echo "   $(pwd)/prisma/migrations/20260502_add_merchant_auth_fields.sql"
        echo ""
    fi
fi
