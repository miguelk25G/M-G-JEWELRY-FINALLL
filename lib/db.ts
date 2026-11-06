import { PrismaClient } from '@prisma/client'

// Determine if we are running in Vercel Preview or targeting the TEST database
const isPreview = process.env.VERCEL_ENV === 'preview'
if (isPreview && !process.env.TEST_PRISMA_DATABASE_URL) throw new Error('Preview requires TEST_PRISMA_DATABASE_URL')

const activeDatabaseUrl = isPreview
  ? process.env.TEST_PRISMA_DATABASE_URL
  : (process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: activeDatabaseUrl ? { db: { url: activeDatabaseUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export default db
