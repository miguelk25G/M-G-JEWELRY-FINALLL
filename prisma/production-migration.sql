-- ==============================================================================
-- M&G JEWELRY - PRODUCTION DATABASE MIGRATION
-- Target: PostgreSQL (Production Database)
-- Purpose: Additive schema updates for Stripe Checkout integration & reconciliation
-- Safety Guarantees:
--   1. Strictly additive: NO DROP COLUMN, NO DROP TABLE, NO ALTER COLUMN TYPE.
--   2. Safe defaults: all new columns provide sensible default values.
--   3. Idempotent: safe to run multiple times (uses IF NOT EXISTS).
--   4. Transactional: runs within a single BEGIN ... COMMIT block.
--
-- PRE-MIGRATION CHECKLIST:
--   [ ] 1. Create a full database backup / snapshot in Neon / AWS / cloud console.
--   [ ] 2. Ensure application deployment is ready to handle new schema fields.
--   [ ] 3. Run during a maintenance window or normal traffic (locks are brief ALTER TABLE ADD COLUMN).
--
-- HOW TO EXECUTE:
--   Option A (via project script with configured environment):
--     pnpm db:migrate
--   Option B (via Neon / Postgres SQL Console directly):
--     Paste and execute the entire SQL block below.
-- ==============================================================================

BEGIN;

-- 1. Add Stripe tracking, reconciliation and inventory reservation columns to "Order" table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reservationStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundedAmount" INTEGER NOT NULL DEFAULT 0;

-- 2. Create unique indexes for Stripe Checkout Session and Payment Intent IDs
CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- 3. Create StripeEvent table for idempotent webhook event deduplication
CREATE TABLE IF NOT EXISTS "StripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

COMMIT;

-- ==============================================================================
-- POST-MIGRATION VERIFICATION QUERIES (Optional check):
-- Run the following queries to verify the columns and table were created successfully:
--
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'Order' AND column_name IN (
--   'stripeSessionId', 'stripePaymentIntentId', 'paymentStatus', 'reservationStatus', 'refundedAmount'
-- );
--
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'StripeEvent';
-- ==============================================================================
