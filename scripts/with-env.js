// Helper to inject TEST database configuration for Vercel Preview environments
// and local preview testing.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure node binary directory is in PATH for Turbopack loader subprocesses
const nodeBinDir = path.dirname(process.execPath);
if (!process.env.PATH?.includes(nodeBinDir)) {
  process.env.PATH = `${nodeBinDir}${path.delimiter}${process.env.PATH || ''}`;
}

function resolveDatabaseEnv() {
  const isPreview = process.env.VERCEL_ENV === 'preview';

  if (isPreview) {
    const testUrl =
      process.env.TEST_POSTGRES_URL ||
      process.env.TEST_DATABASE_URL ||
      process.env.TEST_PRISMA_DATABASE_URL ||
      process.env.TEST_DATABASE_URL_POOLED ||
      process.env.TEST_INTEGRATION_DATABASE_URL;

    if (!testUrl) {
      throw new Error('Preview requires TEST_* database URLs (TEST_POSTGRES_URL, TEST_DATABASE_URL, etc.) bound to mg-database-test. Default DATABASE_URL and POSTGRES_URL fallbacks are strictly prohibited.');
    }

    const testPrismaUrl =
      process.env.TEST_PRISMA_DATABASE_URL ||
      process.env.TEST_POSTGRES_URL ||
      process.env.TEST_DATABASE_URL_POOLED ||
      process.env.TEST_DATABASE_URL;

    const testDirectUrl =
      process.env.TEST_POSTGRES_URL ||
      process.env.TEST_DATABASE_URL ||
      process.env.TEST_PRISMA_DATABASE_URL;

    const testDbUrl =
      process.env.TEST_DATABASE_URL ||
      process.env.TEST_DATABASE_URL_POOLED ||
      process.env.TEST_PRISMA_DATABASE_URL;

    process.env.PRISMA_DATABASE_URL = testPrismaUrl || testUrl;
    process.env.POSTGRES_URL = testDirectUrl || testUrl;
    process.env.DATABASE_URL = testDbUrl || testUrl;

    console.log('[with-env] Vercel Preview detected: Routing Prisma strictly to mg-database-test using TEST_* variables.');
  }
}

resolveDatabaseEnv();

let [, , cmd, ...args] = process.argv;
if (!cmd) {
  process.exit(0);
}

let useShell = false;

// Install only the additive payment fields before Prisma's schema comparison.
// Unique-index creation fails on duplicates; never bypass data-loss checks.
if (process.env.VERCEL_ENV === 'preview' && cmd === 'prisma' && args[0] === 'db' && args[1] === 'push') {
  const migration = spawnSync(process.execPath, [
    path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js'),
    'db', 'execute', '--file', path.join(__dirname, '..', 'prisma', 'preview-payment-fields.sql'),
    '--schema', path.join(__dirname, '..', 'prisma', 'schema.prisma'),
  ], { stdio: 'inherit', env: process.env });
  if (migration.status !== 0) process.exit(migration.status ?? 1);
}

// Ensure cross-platform resolution for prisma and next binaries
if (cmd === 'prisma') {
  const localPrismaEntry = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
  if (fs.existsSync(localPrismaEntry)) {
    cmd = process.execPath;
    args = [localPrismaEntry, ...args];
  } else {
    useShell = true;
  }
} else if (cmd === 'next') {
  const localNextEntry = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
  if (fs.existsSync(localNextEntry)) {
    cmd = process.execPath;
    args = [localNextEntry, ...args];
  } else {
    useShell = true;
  }
}

const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  shell: useShell,
  env: process.env,
});

process.exit(result.status ?? 1);
