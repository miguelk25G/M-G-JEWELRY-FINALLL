-- ==============================================================================
-- M&G JEWELRY: POST-MIGRATION STRICT STRUCTURAL VERIFICATION (mg-restore-test)
-- Any schema or count discrepancy raises an unhandled EXCEPTION,
-- causing psql with ON_ERROR_STOP=1 to immediately fail.
-- ==============================================================================

\echo '------------------------------------------------------------------------------'
\echo '1. RUNNING STRICT AUTOMATED INTEGRITY & SCHEMA ASSERTIONS...'
\echo '------------------------------------------------------------------------------'

DO $$
DECLARE
  v_prod_count integer;
  v_order_count integer;
  v_col_count integer;
  v_idx_count integer;
  v_tbl_exists boolean;
  v_pk_exists boolean;
  v_bad_order_count integer;
BEGIN
  -- 1. Assert exactly 3 products preserved
  SELECT COUNT(*) INTO v_prod_count FROM "Product";
  IF v_prod_count <> 3 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected exactly 3 products, but found %', v_prod_count;
  END IF;

  -- 2. Assert exactly 5 orders preserved
  SELECT COUNT(*) INTO v_order_count FROM "Order";
  IF v_order_count <> 5 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected exactly 5 orders, but found %', v_order_count;
  END IF;

  -- 3. Assert the 5 Stripe columns on "Order" with exact types, nullability and defaults
  SELECT COUNT(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_name = 'Order' AND (
    (column_name = 'stripeSessionId' AND data_type = 'text' AND is_nullable = 'YES') OR
    (column_name = 'stripePaymentIntentId' AND data_type = 'text' AND is_nullable = 'YES') OR
    (column_name = 'paymentStatus' AND data_type = 'text' AND is_nullable = 'NO' AND column_default LIKE '%pending%') OR
    (column_name = 'reservationStatus' AND data_type = 'text' AND is_nullable = 'NO' AND column_default LIKE '%none%') OR
    (column_name = 'refundedAmount' AND data_type = 'integer' AND is_nullable = 'NO' AND column_default LIKE '%0%')
  );

  IF v_col_count <> 5 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected 5 valid Stripe columns on Order table, but found % matching exact specification.', v_col_count;
  END IF;

  -- 4. Assert the 2 unique indexes on "Order"
  SELECT COUNT(*) INTO v_idx_count
  FROM pg_indexes
  WHERE tablename = 'Order' 
    AND indexname IN ('Order_stripeSessionId_key', 'Order_stripePaymentIntentId_key')
    AND indexdef ILIKE '%UNIQUE INDEX%';

  IF v_idx_count <> 2 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected 2 unique indexes on Order, but found %', v_idx_count;
  END IF;

  -- 5. Assert StripeEvent table exists and has Primary Key
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'StripeEvent'
  ) INTO v_tbl_exists;

  IF NOT v_tbl_exists THEN
    RAISE EXCEPTION 'CHECK FAILED: Table StripeEvent does not exist.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'StripeEvent' AND constraint_type = 'PRIMARY KEY'
  ) INTO v_pk_exists;

  IF NOT v_pk_exists THEN
    RAISE EXCEPTION 'CHECK FAILED: Primary key constraint on StripeEvent table is missing.';
  END IF;

  -- 6. Assert correct default values on existing 5 orders
  SELECT COUNT(*) INTO v_bad_order_count
  FROM "Order"
  WHERE "paymentStatus" <> 'pending'
     OR "reservationStatus" <> 'none'
     OR "refundedAmount" <> 0
     OR "stripeSessionId" IS NOT NULL
     OR "stripePaymentIntentId" IS NOT NULL;

  IF v_bad_order_count > 0 THEN
    RAISE EXCEPTION 'CHECK FAILED: % orders have invalid or non-default values.', v_bad_order_count;
  END IF;

  RAISE NOTICE 'SUCCESS: All schema and data integrity assertions passed on mg-restore-test.';
END $$;

\echo '------------------------------------------------------------------------------'
\echo '2. DETAILED STRUCTURAL VERIFICATION OUTPUT'
\echo '------------------------------------------------------------------------------'

\echo '-> Columns in Order:'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Order' AND column_name IN (
  'stripeSessionId', 'stripePaymentIntentId', 'paymentStatus', 'reservationStatus', 'refundedAmount'
)
ORDER BY column_name;

\echo '-> Unique Indexes on Order:'
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Order' AND indexname IN ('Order_stripeSessionId_key', 'Order_stripePaymentIntentId_key')
ORDER BY indexname;

\echo '-> Table StripeEvent Definition:'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'StripeEvent'
ORDER BY ordinal_position;

\echo '-> Data Preservation (Products & Orders):'
SELECT 
  (SELECT COUNT(*)::int FROM "Product") AS products_preserved,
  (SELECT COUNT(*)::int FROM "Order")   AS orders_preserved;

\echo '-> Sample of Existing Orders Backfill Values:'
SELECT 
  id, 
  "orderNumber", 
  "paymentStatus", 
  "reservationStatus", 
  "refundedAmount", 
  "stripeSessionId", 
  "stripePaymentIntentId"
FROM "Order"
ORDER BY "createdAt" ASC;
