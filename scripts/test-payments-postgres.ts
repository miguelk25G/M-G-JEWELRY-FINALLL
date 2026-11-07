import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { createPaymentService } from '../lib/payments'

/**
 * Comprobación fiable de seguridad que verifica que la conexión pertenece a
 * mg-database-test (o a una base de prueba aislada) y descarta de forma estricta la base de producción:
 *
 * 1. Entorno: Rechaza incondicionalmente la ejecución en un entorno de producción (VERCEL_ENV === 'production').
 * 2. Exclusión de producción: Comprueba explícitamente contra todas las variables conocidas de producción
 *    (PROD_DATABASE_URL, PRISMA_DATABASE_URL_PROD, PRODUCTION_DATABASE_URL, PROD_POSTGRES_URL) y descarta
 *    cualquier coincidencia por URL completa o por coincidencia de host + base de datos. En entornos fuera
 *    de Preview, descarta también las variables por defecto (DATABASE_URL, POSTGRES_URL, PRISMA_DATABASE_URL)
 *    que no correspondan a una variable TEST_*.
 * 3. Detección por palabras clave de producción: Rechaza si la URL contiene 'prod' o 'production'.
 * 4. Pertenencia a mg-database-test: En Vercel Preview, los proveedores (como Neon) pueden generar URLs
 *    cuyo subdominio o nombre de base de datos no incluya la palabra "test" (ej. host ep-xyz y base verceldb).
 *    Por tanto, la comprobación verifica fiablemente si la URL coincide con las variables configuradas
 *    para Preview (TEST_POSTGRES_URL, TEST_DATABASE_URL, TEST_PRISMA_DATABASE_URL, TEST_DATABASE_URL_POOLED,
 *    TEST_INTEGRATION_DATABASE_URL), o si apunta a localhost/127.0.0.1, o si contiene 'test'/'integration'/'preview'.
 */
export function assertIsolatedTestDatabase(url?: string): boolean {
  if (!url) {
    throw new Error('Database URL is required.')
  }

  // 1. Incondicionalmente rechazar si estamos en entorno de producción
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('SAFETY CHECK FAILED: Cannot run test database operations in a production environment!')
  }

  // 2. Variables de prueba configuradas (que apuntan a mg-database-test)
  const testEnvUrls = [
    process.env.TEST_POSTGRES_URL,
    process.env.TEST_DATABASE_URL,
    process.env.TEST_PRISMA_DATABASE_URL,
    process.env.TEST_DATABASE_URL_POOLED,
    process.env.TEST_INTEGRATION_DATABASE_URL,
  ].filter(Boolean) as string[]

  if (process.env.VERCEL_ENV === 'preview') {
    if (process.env.POSTGRES_URL) testEnvUrls.push(process.env.POSTGRES_URL)
    if (process.env.DATABASE_URL) testEnvUrls.push(process.env.DATABASE_URL)
    if (process.env.PRISMA_DATABASE_URL) testEnvUrls.push(process.env.PRISMA_DATABASE_URL)
  }

  // 3. Variables de producción a excluir estrictamente
  const prodUrls = [
    process.env.PROD_DATABASE_URL,
    process.env.PRISMA_DATABASE_URL_PROD,
    process.env.PRODUCTION_DATABASE_URL,
    process.env.PROD_POSTGRES_URL,
  ].filter(Boolean) as string[]

  if (process.env.VERCEL_ENV !== 'preview') {
    for (const key of ['PRISMA_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL']) {
      const val = process.env[key]
      if (val && !testEnvUrls.includes(val)) {
        prodUrls.push(val)
      }
    }
  }

  for (const prodUrl of prodUrls) {
    if (url === prodUrl) {
      throw new Error('SAFETY CHECK FAILED: Connection URL matches the production database! Operation rejected.')
    }
    try {
      const u = new URL(url)
      const p = new URL(prodUrl)
      if (u.host === p.host && u.pathname === p.pathname) {
        throw new Error('SAFETY CHECK FAILED: Connection URL matches the production database host and pathname! Operation rejected.')
      }
    } catch {
      // ignore parsing error
    }
  }

  const lowerUrl = url.toLowerCase()

  // 4. Rechazar si contiene identificadores de producción
  if (lowerUrl.includes('prod') || lowerUrl.includes('production')) {
    throw new Error('SAFETY CHECK FAILED: Target database URL contains production identifier! Operation rejected.')
  }

  // 5. Verificar pertenencia a mg-database-test o entorno aislado de pruebas
  const matchesConfiguredTest = testEnvUrls.some((tUrl) => {
    if (url === tUrl) return true
    try {
      const u = new URL(url)
      const t = new URL(tUrl)
      return u.host === t.host && u.pathname === t.pathname
    } catch {
      return false
    }
  })

  const isLocalOrKeywordTestDb =
    lowerUrl.includes('test') ||
    lowerUrl.includes('integration') ||
    lowerUrl.includes('preview') ||
    lowerUrl.includes('localhost') ||
    lowerUrl.includes('127.0.0.1') ||
    lowerUrl.includes('::1')

  if (!matchesConfiguredTest && !isLocalOrKeywordTestDb) {
    throw new Error('SAFETY CHECK FAILED: Connection does not belong to a verified isolated test database (mg-database-test or isolated test instance). Operation rejected.')
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

  // Must accept verified isolated test databases with "test" or localhost
  assert.equal(
    assertIsolatedTestDatabase('postgres://test_user:test_pass@ep-test-pooler.us-east-1.aws.neon.tech/mg-database-test'),
    true
  )
  assert.equal(
    assertIsolatedTestDatabase('postgresql://postgres:postgres@localhost:5432/mg_integration_test'),
    true
  )

  // Must accept provider URLs for mg-database-test in Preview even when URL string lacks "test"
  const prevEnv = process.env.VERCEL_ENV
  const prevTestPostgres = process.env.TEST_POSTGRES_URL
  try {
    process.env.VERCEL_ENV = 'preview'
    const providerNeonUrl = 'postgres://default:secret123@ep-restless-cloud-987654.us-east-1.aws.neon.tech/verceldb?sslmode=require'
    process.env.TEST_POSTGRES_URL = providerNeonUrl
    assert.equal(assertIsolatedTestDatabase(providerNeonUrl), true)
  } finally {
    process.env.VERCEL_ENV = prevEnv
    process.env.TEST_POSTGRES_URL = prevTestPostgres
  }

  // Must strictly reject execution in production environment
  const prevEnvProd = process.env.VERCEL_ENV
  try {
    process.env.VERCEL_ENV = 'production'
    assert.throws(
      () => assertIsolatedTestDatabase('postgres://test_user:test_pass@ep-test-pooler.us-east-1.aws.neon.tech/mg-database-test'),
      /SAFETY CHECK FAILED: Cannot run test database operations in a production environment!/
    )
  } finally {
    process.env.VERCEL_ENV = prevEnvProd
  }
})

// 2. Integration test against a disposable PostgreSQL database with the current Prisma schema
const url =
  process.env.TEST_INTEGRATION_DATABASE_URL ||
  (process.env.VERCEL_ENV === 'preview'
    ? (process.env.TEST_POSTGRES_URL ||
       process.env.TEST_DATABASE_URL ||
       process.env.TEST_PRISMA_DATABASE_URL ||
       process.env.TEST_DATABASE_URL_POOLED ||
       process.env.POSTGRES_URL ||
       process.env.DATABASE_URL)
    : undefined)

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
