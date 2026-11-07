// Validates connection to mg-database-test before any schema push or write operations
const { PrismaClient } = require('@prisma/client');

async function validateTestDatabaseConnection() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  if (!isPreview) {
    console.log('[validate-test-db] Non-preview environment; skipping preview test database validation.');
    return;
  }

  console.log('[validate-test-db] Validating connection to mg-database-test before schema push or write operations...');

  // Use strictly TEST_* variables bound to mg-database-test; no fallbacks to DATABASE_URL or POSTGRES_URL
  const testUrl =
    process.env.TEST_POSTGRES_URL ||
    process.env.TEST_DATABASE_URL ||
    process.env.TEST_PRISMA_DATABASE_URL ||
    process.env.TEST_DATABASE_URL_POOLED ||
    process.env.TEST_INTEGRATION_DATABASE_URL;

  if (!testUrl) {
    throw new Error('SAFETY CHECK FAILED: Preview environment requires a TEST_* database URL bound to mg-database-test. Fallbacks to DATABASE_URL or POSTGRES_URL are strictly prohibited.');
  }

  // Safety checks: strictly exclude production
  const prodUrls = [
    process.env.PROD_DATABASE_URL,
    process.env.PRISMA_DATABASE_URL_PROD,
    process.env.PRODUCTION_DATABASE_URL,
    process.env.PROD_POSTGRES_URL,
  ].filter(Boolean);

  for (const prodUrl of prodUrls) {
    if (testUrl === prodUrl) {
      throw new Error('SAFETY CHECK FAILED: Target test database URL matches production database URL! Operation rejected.');
    }
    let isMatchingProd = false;
    try {
      const u = new URL(testUrl);
      const p = new URL(prodUrl);
      const uPath = u.pathname.replace(/\/+$/, '');
      const pPath = p.pathname.replace(/\/+$/, '');
      if (u.host.toLowerCase() === p.host.toLowerCase() && uPath.toLowerCase() === pPath.toLowerCase()) {
        isMatchingProd = true;
      }
    } catch {}
    if (isMatchingProd) {
      throw new Error('SAFETY CHECK FAILED: Target test database URL matches production database host and database name (even with different credentials or parameters)! Operation rejected.');
    }
  }

  const lower = testUrl.toLowerCase();
  if (lower.includes('prod') || lower.includes('production')) {
    throw new Error('SAFETY CHECK FAILED: Target test database URL contains production keyword! Operation rejected.');
  }

  // Live connection test
  const prisma = new PrismaClient({ datasourceUrl: testUrl });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[validate-test-db] SUCCESS: Connection to mg-database-test is verified, authenticated, and active.');
  } catch (err) {
    console.error('[validate-test-db] ERROR: Failed to connect to mg-database-test:', err.message);
    throw new Error(`Connection validation to mg-database-test failed: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  validateTestDatabaseConnection()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { validateTestDatabaseConnection };
