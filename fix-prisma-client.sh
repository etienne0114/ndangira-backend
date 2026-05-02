#!/bin/bash

echo "🔧 Fixing Prisma Client generation issue..."
echo ""

# Step 1: Clean node_modules/@prisma
echo "1️⃣ Cleaning Prisma Client cache..."
rm -rf node_modules/@prisma
rm -rf node_modules/.prisma

# Step 2: Pull latest schema from database
echo ""
echo "2️⃣ Pulling latest schema from Supabase..."
npx prisma db pull

# Step 3: Generate Prisma Client
echo ""
echo "3️⃣ Generating fresh Prisma Client..."
npx prisma generate

# Step 4: Verify the enum exists
echo ""
echo "4️⃣ Verifying ListingCategory enum..."
if grep -q "enum ListingCategory" prisma/schema.prisma; then
  echo "✅ ListingCategory enum found in schema"
else
  echo "❌ ListingCategory enum NOT found in schema"
  exit 1
fi

echo ""
echo "✅ Prisma Client regenerated successfully!"
echo ""
echo "Now run: npm run dev"
