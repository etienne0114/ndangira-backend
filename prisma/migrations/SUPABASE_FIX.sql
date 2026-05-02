-- SUPABASE MIGRATION FIX
-- Run this SQL in Supabase SQL Editor
-- This fixes the "type ListingCategory does not exist" error

-- Step 1: Check if ListingCategory enum exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingCategory') THEN
        CREATE TYPE "ListingCategory" AS ENUM (
            'GROCERIES', 
            'RESTAURANTS', 
            'FASHION', 
            'ELECTRONICS', 
            'HOME', 
            'HEALTH', 
            'SERVICES',
            'SUPERMARKET',
            'PHARMACY',
            'HOUSING'
        );
    END IF;
END $$;

-- Step 2: Add missing enum values if they don't exist
DO $$ 
BEGIN
    -- Add SUPERMARKET if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'SUPERMARKET' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ListingCategory')
    ) THEN
        ALTER TYPE "ListingCategory" ADD VALUE 'SUPERMARKET';
    END IF;
    
    -- Add PHARMACY if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PHARMACY' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ListingCategory')
    ) THEN
        ALTER TYPE "ListingCategory" ADD VALUE 'PHARMACY';
    END IF;
    
    -- Add HOUSING if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'HOUSING' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ListingCategory')
    ) THEN
        ALTER TYPE "ListingCategory" ADD VALUE 'HOUSING';
    END IF;
END $$;

-- Step 3: Add missing columns to Merchant table
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "businessType" "ListingCategory";
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "addressLine" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" INTEGER DEFAULT 5;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "aiEnabled" BOOLEAN DEFAULT true;

-- Step 4: Update existing rows with default values (if any exist)
UPDATE "Merchant" SET "email" = CONCAT('merchant', "id", '@ndangira.rw') WHERE "email" IS NULL;
UPDATE "Merchant" SET "passwordHash" = '$2a$10$defaulthash' WHERE "passwordHash" IS NULL;
UPDATE "Merchant" SET "businessType" = 'GROCERIES' WHERE "businessType" IS NULL;
UPDATE "Merchant" SET "serviceRadiusKm" = 5 WHERE "serviceRadiusKm" IS NULL;
UPDATE "Merchant" SET "aiEnabled" = true WHERE "aiEnabled" IS NULL;

-- Step 5: Make required columns NOT NULL
ALTER TABLE "Merchant" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "businessType" SET NOT NULL;

-- Step 6: Add unique constraint on email (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Merchant_email_key'
    ) THEN
        ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_email_key" UNIQUE ("email");
    END IF;
END $$;

-- Step 7: Add index on businessType and neighborhood (if it doesn't exist)
CREATE INDEX IF NOT EXISTS "Merchant_businessType_neighborhood_idx" 
ON "Merchant"("businessType", "neighborhood");

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'You can now close this window and run: npx prisma generate';
END $$;
