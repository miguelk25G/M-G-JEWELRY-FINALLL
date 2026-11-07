-- ==============================================================================
-- M&G JEWELRY: PRE-MIGRATION TARGET VERIFICATION (Prisma Postgres: mg-restore-test)
-- Read-only safety inspection before running production-migration.sql.
-- ==============================================================================

\echo '------------------------------------------------------------------------------'
\echo '1. PRISMA POSTGRES TARGET IDENTIFICATION (Database, User, Server Info)'
\echo '------------------------------------------------------------------------------'
SELECT 
  current_database() AS db_name,
  current_user AS session_user,
  inet_server_addr() AS server_ip,
  version() AS postgres_version;

\echo '------------------------------------------------------------------------------'
\echo '2. PRODUCTION ISOLATION CHECK: External Vercel / Prisma Active Connections'
\echo '------------------------------------------------------------------------------'
SELECT 
  pid, 
  application_name, 
  client_addr, 
  state, 
  backend_start
FROM pg_stat_activity 
WHERE datname = current_database() 
  AND pid <> pg_backend_pid()
  AND (application_name ILIKE '%vercel%' OR application_name ILIKE '%next%');

\echo '------------------------------------------------------------------------------'
\echo '3. RESTORE BASELINE CHECK (Expected: 3 Products, 5 Orders)'
\echo '------------------------------------------------------------------------------'
SELECT 
  (SELECT COUNT(*)::int FROM "Product") AS product_count,
  (SELECT COUNT(*)::int FROM "Order")   AS order_count;

\echo '------------------------------------------------------------------------------'
\echo '4. PREEXISTING STRIPE COLUMNS INSPECTION'
\echo '------------------------------------------------------------------------------'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Order' AND column_name IN (
  'stripeSessionId', 'stripePaymentIntentId', 'paymentStatus', 'reservationStatus', 'refundedAmount'
)
ORDER BY column_name;
