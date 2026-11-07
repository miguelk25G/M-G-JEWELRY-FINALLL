import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { createPaymentService } from '../lib/payments'

/**
 * Comprobación de seguridad que descarta la base de producción:
 * 1. Comprueba explícitamente que la URL no coincida con ninguna variable de producción.
 * 2. En entornos locales o fuera de Preview, rechaza las URLs compartidas por defecto.
 * 3. Exige que el nombre de la base de datos o el host contenga 'test', 'integration', 'preview' o apunte a localhost.
 */
export function assertIsolatedTestDatabase(url?: string): boolean {
  if (!url) {
    throw new Error('Database URL is required.')
  }

  const prodUrls = [
    process.env.PROD_DATABASE_URL,
    process.env.PRISMA_DATABASE_URL_PROD,
    process.env.PRODUCTION_DATABASE_URL,
  ].filter(Boolean) as string[]

  if (process.env.VERCEL_ENV !== 'preview') {
    if (process.env.PRISMA_DATABASE_URL) prodUrls.push(process.env.PRISMA_DATABASE_URL)
    if (process.env.DATABASE_URL) prodUrls.push(process.env.DATABASE_URL)
    if (process.env.POSTGRES_URL) prodUrls.push(process.env.POSTGRES_URL)
  }

  for (const prodUrl of prodUrls) {
    if (url === prodUrl) {
      throw new Error('SAFETY CHECK FAILED: Connection URL matches the production database! Operation rejected.')
    }
  }

  const lowerUrl = url.toLowerCase()
  const isIsolatedTestDb =
    lowerUrl.includes('test') ||
    lowerUrl.includes('integration') ||
    lowerUrl.includes('preview') ||
    lowerUrl.includes('localhost') ||
    lowerUrl.includes('127.0.0.1')

  if (!isIsolatedTestDb) {
    throw new Error('SAFETY CHECK FAILED: Target database is not an isolated test database. Must contain "test", "integration", "preview" or target localhost.')
  }

  return true
}

// 1. Safety test: verifies that production URLs are strictly rejected and isolated test URLs accepted
test('PostgreSQL safety guard: strictly rejects production databases and requires test isolation', () => {
  // Must reject production database URLs
  assert.throws(
    () => assertIsolatedTestDatabase('postgres://user:pass@ep-prod-pooler.us-east-1.aws.neon.tech/mg-database-prod'),
    /SAFETY CHECK FAILED/
  )
  assert.throws(
    () => assertIsolatedTestDatabase('postgresql://admin:secret@live-db.internal:5432/jewelry_production'),
    /SAFETY CHECK FAILED/
  )

  // Must accept verified isolated test databases
  assert.equal(
    assertIsolatedTestDatabase('postgres://test_user:test_pass@ep-test-pooler.us-east-1.aws.neon.tech/mg-database-test'),
    true
  )
  assert.equal(
    assertIsolatedTestDatabase('postgresql://postgres:postgres@localhost:5432/mg_integration_test'),
    true
  )
})

// 2. Integration test against a disposable PostgreSQL database with the current Prisma schema
const url = process.env.TEST_INTEGRATION_DATABASE_URL || (process.env.VERCEL_ENV === 'preview' ? (process.env.TEST_POSTGRES_URL || process.env.TEST_DATABASE_URL) : undefined)

test('PostgreSQL: concurrent expiration/cancellation releases exactly once', { skip: !url }, async () => {
  assertIsolatedTestDatabase(url!)

  const db = new PrismaClient({ datasourceUrl: url })
  const id = `integration-${randomUUID()}`
  try {
    await db.product.create({ data: { id, name: 'Integration fixture', slug: id, description: 'Disposable test', price: 100, metalType: 'gold', category: 'rings', images: '[]', inventoryQty: 0 } })
    await db.order.create({ data: { id, orderNumber: id, customerName: 'Test', email: 'test@example.invalid', shippingAddress: '{}', subtotal: 100, total: 100, stripeSessionId: id, reservationStatus: 'reserved', items: { create: { productId: id, name: 'Integration fixture', price: 100, quantity: 1 } }, transactions: { create: { provider: 'stripe', providerId: id, status: 'pending', amount: 100 } } } })
    const session = { id, client_reference_id: id, metadata: { orderId: id }, amount_total: 10000, currency: 'usd', payment_status: 'unpaid', status: 'expired' }
    const service = createPaymentService(db, { checkout: { sessions: { retrieve: async () => session } } })
    const event = { id, type: 'checkout.session.expired', data: { object: { id } } }
    await Promise.all([service.cancel(id), service.cancel(id), service.processEvent(event), service.processEvent(event)])
    assert.equal((await db.product.findUniqueOrThrow({ where: { id } })).inventoryQty, 1)
    assert.equal(await db.stripeEvent.count({ where: { id } }), 1)
  } finally {
    await db.stripeEvent.deleteMany({ where: { id } })
    await db.order.deleteMany({ where: { id } })
    await db.product.deleteMany({ where: { id } })
    await db.$disconnect()
  }
})
