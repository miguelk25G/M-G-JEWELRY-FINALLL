-- Additive Preview upgrade. No drops, truncation, backfill or data-loss override.
BEGIN;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reservationStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundedAmount" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
CREATE TABLE IF NOT EXISTS "StripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);
COMMIT;
