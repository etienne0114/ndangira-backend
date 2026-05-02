-- CreateTable: Category (replaces the ListingCategory enum)
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique category name
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- Seed system categories using fixed IDs so the backfill below can reference them
INSERT INTO "Category" ("id", "name", "label", "isSystem") VALUES
    ('cat_groceries',   'GROCERIES',   'Groceries',   true),
    ('cat_restaurants', 'RESTAURANTS', 'Restaurants', true),
    ('cat_fashion',     'FASHION',     'Fashion',     true),
    ('cat_electronics', 'ELECTRONICS', 'Electronics', true),
    ('cat_home',        'HOME',        'Home',        true),
    ('cat_health',      'HEALTH',      'Health',      true),
    ('cat_services',    'SERVICES',    'Services',    true);

-- AddColumn: nullable categoryId on Listing (required for safe backfill)
ALTER TABLE "Listing" ADD COLUMN "categoryId" TEXT;

-- Backfill: map existing enum values to category IDs
UPDATE "Listing" SET "categoryId" = CASE "category"::text
    WHEN 'GROCERIES'   THEN 'cat_groceries'
    WHEN 'RESTAURANTS' THEN 'cat_restaurants'
    WHEN 'FASHION'     THEN 'cat_fashion'
    WHEN 'ELECTRONICS' THEN 'cat_electronics'
    WHEN 'HOME'        THEN 'cat_home'
    WHEN 'HEALTH'      THEN 'cat_health'
    WHEN 'SERVICES'    THEN 'cat_services'
    ELSE NULL
END;

-- Make categoryId NOT NULL after backfill
ALTER TABLE "Listing" ALTER COLUMN "categoryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropIndex: old enum-based index
DROP INDEX IF EXISTS "Listing_category_isFeatured_idx";

-- CreateIndex: new categoryId-based index
CREATE INDEX "Listing_categoryId_isFeatured_idx" ON "Listing"("categoryId", "isFeatured");

-- DropColumn: old enum column
ALTER TABLE "Listing" DROP COLUMN "category";

-- DropEnum
DROP TYPE IF EXISTS "ListingCategory";
