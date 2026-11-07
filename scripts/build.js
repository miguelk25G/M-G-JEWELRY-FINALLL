// Production-safe build runner for M&G Jewelry
// Separates dangerous schema push operations from the production build pipeline.
const { spawnSync } = require('child_process');
const path = require('path');

const isPreview = process.env.VERCEL_ENV === 'preview';
const isProduction = process.env.VERCEL_ENV === 'production';

function run(cmd, args) {
  console.log(`[build] Running: ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if (res.status !== 0) {
    console.error(`[build] Command failed with exit code ${res.status}: ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

console.log(`[build] Build process started. Environment: VERCEL_ENV=${process.env.VERCEL_ENV || 'local'}`);

// 1. Always generate Prisma client
const withEnv = path.join(__dirname, 'with-env.js');
run(process.execPath, [withEnv, 'prisma', 'generate']);

// 2. In Preview: synchronize test database (mg-database-test) and run payment tests
if (isPreview) {
  console.log('[build] Vercel Preview detected: synchronizing test database schema and running test suite.');
  run(process.execPath, [withEnv, 'prisma', 'db', 'push']);
  run(process.execPath, ['--import', 'tsx', '--test', path.join(__dirname, 'test-payments.ts'), path.join(__dirname, 'test-payments-postgres.ts')]);
} else if (isProduction) {
  // 3. In Production: strictly skip prisma db push to protect production database integrity
  console.log('[build] Vercel Production detected: prisma db push is intentionally SKIPPED to protect production database.');
  console.log('[build] Apply schema changes safely via "pnpm db:migrate" using prisma/production-migration.sql after taking a database backup.');
} else {
  console.log('[build] Local/development build detected: prisma db push is not auto-executed during build.');
}

// 4. Next.js build
run(process.execPath, [withEnv, 'next', 'build']);

console.log('[build] Build completed successfully.');
