// Ensure TEST database environment variables are mapped in Vercel Preview
if (
  process.env.VERCEL_ENV === 'preview' ||
  Boolean(process.env.TEST_PRISMA_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.TEST_POSTGRES_URL)
) {
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

  if (testPrismaUrl) process.env.PRISMA_DATABASE_URL = testPrismaUrl;
  if (testDirectUrl) process.env.POSTGRES_URL = testDirectUrl;
  if (testDbUrl) process.env.DATABASE_URL = testDbUrl;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
}

export default nextConfig
