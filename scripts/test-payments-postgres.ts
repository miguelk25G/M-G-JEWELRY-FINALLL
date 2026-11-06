import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { createPaymentService } from '../lib/payments'

// Opt-in integration test against a disposable PostgreSQL database with the
// current Prisma schema. Stripe transport is still fake; no payment is made.
const url = process.env.TEST_INTEGRATION_DATABASE_URL || (process.env.VERCEL_ENV === 'preview' ? process.env.TEST_POSTGRES_URL : undefined)
test('PostgreSQL: concurrent expiration/cancellation releases exactly once', { skip: !url }, async () => {
  if ([process.env.PRISMA_DATABASE_URL, process.env.DATABASE_URL, process.env.POSTGRES_URL].includes(url)) throw new Error('Use a dedicated integration database')
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
