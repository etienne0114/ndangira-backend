-- Migration: Add missing authentication and merchant fields
-- Date: 2026-05-02
-- Description: Adds email, passwordHash, businessType, and other missing fields to Merchant table

-- Step 1: Add missing enum values to ListingCategory
ALTER TYPE "ListingCategory" ADD VALUE IF NOT EXISTS 'SUPERMARKET';
ALTER TYPE "ListingCategory" ADD VALUE IF NOT EXISTS 'PHARMACY';
ALTER TYPE "ListingCategory" ADD VALUE IF NOT EXISTS 'HOUSING';

-- Step 2: Add missing columns to Merchant table
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "businessType" "ListingCategory";
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "addressLine" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" INTEGER DEFAULT 5;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "aiEnabled" BOOLEAN DEFAULT true;

-- Step 3: Update existing rows with default values (if any exist)
UPDATE "Merchant" SET "email" = CONCAT('merchant', "id", '@ndangira.rw') WHERE "email" IS NULL;
UPDATE "Merchant" SET "passwordHash" = '$2a$10$defaulthash' WHERE "passwordHash" IS NULL;
UPDATE "Merchant" SET "businessType" = 'GROCERIES' WHERE "businessType" IS NULL;
UPDATE "Merchant" SET "serviceRadiusKm" = 5 WHERE "serviceRadiusKm" IS NULL;
UPDATE "Merchant" SET "aiEnabled" = true WHERE "aiEnabled" IS NULL;

-- Step 4: Make required columns NOT NULL
ALTER TABLE "Merchant" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "businessType" SET NOT NULL;

-- Step 5: Add unique constraint on email
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_email_key" UNIQUE ("email");

-- Step 6: Add index on businessType and neighborhood
CREATE INDEX IF NOT EXISTS "Merchant_businessType_neighborhood_idx" ON "Merchant"("businessType", "neighborhood");
