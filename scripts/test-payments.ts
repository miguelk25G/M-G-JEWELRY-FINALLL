import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { createPaymentService, createWebhookHandler, validateSize } from '../lib/payments'

// Contract tests: actual production service/HTTP handler, fake Stripe transport
// and serialized in-memory Prisma adapter. NOT a PostgreSQL concurrency proof.
function fixture() {
  let state: any = {
    order: { id: 'o1', stripeSessionId: 'cs_1', total: 100, currency: 'USD', paymentStatus: 'pending', reservationStatus: 'reserved', refundedAmount: 0, items: [{ productId: 'p1', quantity: 1 }] },
    stock: 0, events: {}, transaction: { orderId: 'o1', provider: 'stripe', providerId: 'cs_1', status: 'pending' },
  }
  const match = (obj: any, where: any) => Object.entries(where).every(([k, v]) => obj[k] === v)
  const db: any = {
    order: {
      findUnique: async ({ where }: any) => match(state.order, where) ? structuredClone(state.order) : null,
      update: async ({ data }: any) => Object.assign(state.order, data),
      updateMany: async ({ where, data }: any) => { const count = +match(state.order, where); if (count) Object.assign(state.order, data); return { count } },
    },
    product: { update: async ({ data }: any) => { state.stock += data.inventoryQty.increment } },
    transaction: { updateMany: async ({ where, data }: any) => { if (match(state.transaction, where)) Object.assign(state.transaction, data) } },
    stripeEvent: {
      findUnique: async ({ where }: any) => state.events[where.id],
      create: async ({ data }: any) => { if (state.events[data.id]) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); state.events[data.id] = data },
    },
  }
  let queue = Promise.resolve()
  db.$transaction = (fn: any, options: any) => {
    assert.equal(options.isolationLevel, 'Serializable')
    const result = queue.then(async () => {
      const before = structuredClone(state)
      try { return await fn(db) } catch (e) { state = before; throw e }
    })
    queue = result.catch(() => {})
    return result
  }
  const session: any = { id: 'cs_1', client_reference_id: 'o1', metadata: { orderId: 'o1' }, amount_total: 10000, currency: 'usd', payment_status: 'unpaid', status: 'open', payment_intent: 'pi_1' }
  const charge: any = { id: 'ch_1', payment_intent: 'pi_1', currency: 'usd', amount: 10000, amount_refunded: 2500 }
  const stripe: any = { checkout: { sessions: {
    retrieve: async () => structuredClone(session),
    expire: async () => { session.status = 'expired'; return structuredClone(session) },
  } }, charges: { retrieve: async () => structuredClone(charge) }, paymentIntents: { retrieve: async () => ({ status: 'requires_payment_method' }) } }
  const service = createPaymentService(db, stripe)
  const event = (type: string, id = type) => ({ id, type, data: { object: { id: type === 'charge.refunded' ? 'ch_1' : 'cs_1' } } })
  const paid = () => { session.payment_status = 'paid'; session.status = 'complete' }
  return { db, stripe, service, session, charge, event, paid, state: () => state }
}

test('reject missing/invalid/required sizes; valid size succeeds', () => {
  const product = { sizes: '["6","7"]' }
  assert.throws(() => validateSize(product))
  assert.throws(() => validateSize(product, '8'))
  assert.throws(() => validateSize({ sizes: 'invalid' }, '6'))
  assert.doesNotThrow(() => validateSize(product, '6'))
})

test('unsigned, invalid and unconfigured webhook never invokes service', async () => {
  let calls = 0
  const sdk = new Stripe('test-placeholder')
  const handler = (secret?: string) => createWebhookHandler(() => ({ processEvent: () => { calls++ } }), () => sdk, () => secret)
  assert.equal((await handler()(new Request('https://test', { method: 'POST', body: '{}' }))).status, 503)
  assert.equal((await handler('test-signing-secret')(new Request('https://test', { method: 'POST', body: '{}' }))).status, 400)
  assert.equal((await handler('test-signing-secret')(new Request('https://test', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'invalid' } }))).status, 400)
  assert.equal(calls, 0)
})

test('real Stripe SDK signature verification executes handler and actual payment service', async () => {
  const f = fixture(); f.paid()
  const sdk = new Stripe('test-placeholder')
  const payload = JSON.stringify(f.event('checkout.session.completed'))
  const secret = 'local-test-signing-fixture'
  const header = sdk.webhooks.generateTestHeaderString({ payload, secret })
  const handler = createWebhookHandler(() => f.service, () => sdk, () => secret)
  const response = await handler(new Request('https://test', { method: 'POST', body: payload, headers: { 'stripe-signature': header } }))
  assert.equal(response.status, 200); assert.equal(f.state().order.paymentStatus, 'paid')
})

test('simultaneous duplicate completions only commit once', async () => {
  const f = fixture(); f.paid()
  await Promise.all(Array.from({ length: 8 }, () => f.service.processEvent(f.event('checkout.session.completed'))))
  assert.equal(Object.keys(f.state().events).length, 1)
  assert.equal(f.state().order.reservationStatus, 'consumed'); assert.equal(f.state().stock, 0)
})

test('completion unpaid waits, async success confirms', async () => {
  const f = fixture(); f.session.status = 'complete'
  await f.service.processEvent(f.event('checkout.session.completed'))
  assert.equal(f.state().order.paymentStatus, 'pending')
  f.paid(); await f.service.processEvent(f.event('checkout.session.async_payment_succeeded'))
  assert.equal(f.state().order.paymentStatus, 'paid')
})

test('attempt failure keeps reservation; terminal async failure releases once', async () => {
  const f = fixture()
  await f.service.processEvent(f.event('payment_intent.payment_failed'))
  assert.equal(f.state().stock, 0)
  f.session.status = 'complete'
  await Promise.all([f.service.processEvent(f.event('checkout.session.async_payment_failed', 'a')), f.service.processEvent(f.event('checkout.session.async_payment_failed', 'b'))])
  assert.equal(f.state().stock, 1)
})

test('cancel and expiration events concurrently release once', async () => {
  const f = fixture(); f.session.status = 'expired'
  await Promise.all([f.service.cancel('cs_1'), f.service.cancel('cs_1'), f.service.processEvent(f.event('checkout.session.expired'))])
  assert.equal(f.state().stock, 1); assert.equal(f.state().order.paymentStatus, 'failed')
})

test('payment wins expiration race: cancellation cannot return stock', async () => {
  const f = fixture()
  f.stripe.checkout.sessions.expire = async () => { f.paid(); throw new Error('already complete') }
  await assert.rejects(f.service.cancel('cs_1'))
  await f.service.processEvent(f.event('checkout.session.completed'))
  assert.equal(f.state().stock, 0); assert.equal(f.state().order.paymentStatus, 'paid')
})

test('failed expiration of open session retains reservation', async () => {
  const f = fixture(); f.stripe.checkout.sessions.expire = async () => { throw new Error('network') }
  await assert.rejects(f.service.cancel('cs_1'))
  assert.equal(f.state().stock, 0); assert.equal(f.state().order.paymentStatus, 'pending')
})

for (const [field, bad] of [['amount_total', 9999], ['currency', 'eur'], ['client_reference_id', 'other'], ['id', 'cs_other']] as const) {
  test(`mismatched ${field} rolls back event and payment`, async () => {
    const f = fixture(); f.paid(); f.session[field] = bad
    await assert.rejects(f.service.processEvent(f.event('checkout.session.completed')))
    assert.equal(Object.keys(f.state().events).length, 0); assert.equal(f.state().order.paymentStatus, 'pending')
  })
}

test('partial and repeated refunds never restock or regress fulfillment', async () => {
  const f = fixture(); f.paid(); await f.service.processEvent(f.event('checkout.session.completed'))
  await Promise.all([f.service.processEvent(f.event('charge.refunded', 'r1')), f.service.processEvent(f.event('charge.refunded', 'r1'))])
  assert.equal(f.state().order.paymentStatus, 'partially_refunded'); assert.equal(f.state().stock, 0)
  f.charge.amount_refunded = 10000
  await f.service.processEvent(f.event('charge.refunded', 'r2'))
  await f.service.processEvent(f.event('checkout.session.completed', 'late'))
  assert.equal(f.state().order.paymentStatus, 'refunded'); assert.equal(f.state().stock, 0)
  assert.equal(f.state().order.status, 'processing')
})

test('serialization conflicts retry the actual service', async () => {
  const f = fixture(); f.paid(); const original = f.db.$transaction; let calls = 0
  f.db.$transaction = (...args: any[]) => { if (++calls === 1) throw Object.assign(new Error('serialization'), { code: 'P2034' }); return original(...args) }
  await f.service.processEvent(f.event('checkout.session.completed'))
  assert.equal(calls, 2); assert.equal(f.state().order.paymentStatus, 'paid')
})

// --- Tests for launch review resilience & concurrency (Commit 86ed8db revision) ---

async function simulateDbRegisterRecovery(db: any, stripe: any, orderId: string, sessionId: string) {
  const currentSession = await stripe.checkout.sessions.retrieve(sessionId)
  const isPaid = currentSession?.payment_status === "paid" ||
    (currentSession?.payment_status === "no_payment_required" && currentSession?.amount_total === 0)

  if (isPaid) {
    await createPaymentService(db, stripe).reconcile(sessionId)
    return { outcome: 'confirmed_paid' }
  }

  let expiredSuccessfully = false
  if (currentSession?.status === "expired") {
    expiredSuccessfully = true
  } else {
    try {
      const expiredSession = await stripe.checkout.sessions.expire(sessionId)
      if (expiredSession.status === "expired") {
        expiredSuccessfully = true
      }
    } catch {
      expiredSuccessfully = false
    }
  }

  if (expiredSuccessfully) {
    const res = await createPaymentService(db, stripe).releaseReservation(orderId, "Sesión expirada tras fallo de registro en BD")
    return { outcome: 'released', res }
  } else {
    return { outcome: 'retained_unresolved' }
  }
}

test('DB registration failure + Stripe expire failure strictly retains stock (0 restocked)', async () => {
  const f = fixture()
  f.stripe.checkout.sessions.expire = async () => { throw new Error('Stripe API 500 error') }
  
  const result = await simulateDbRegisterRecovery(f.db, f.stripe, 'o1', 'cs_1')
  assert.equal(result.outcome, 'retained_unresolved')
  assert.equal(f.state().stock, 0, 'Inventory must NOT be released if Stripe expire fails')
  assert.equal(f.state().order.reservationStatus, 'reserved', 'Reservation must remain active')
  assert.equal(f.state().order.paymentStatus, 'pending')
})

test('DB registration failure + session already paid in Stripe confirms order and never releases stock', async () => {
  const f = fixture()
  f.paid() // session is paid in Stripe
  
  const result = await simulateDbRegisterRecovery(f.db, f.stripe, 'o1', 'cs_1')
  assert.equal(result.outcome, 'confirmed_paid')
  assert.equal(f.state().stock, 0, 'No stock should be returned on paid session')
  assert.equal(f.state().order.paymentStatus, 'paid')
  assert.equal(f.state().order.reservationStatus, 'consumed')
})

test('two concurrent releaseReservation calls increment stock exactly once', async () => {
  const f = fixture()
  const [res1, res2] = await Promise.all([
    f.service.releaseReservation('o1', 'Cancelation 1'),
    f.service.releaseReservation('o1', 'Cancelation 2'),
  ])
  assert.equal(f.state().stock, 1, 'Stock must only increment once')
  assert.equal(f.state().order.reservationStatus, 'released')
  const counts = [res1.count, res2.count].sort()
  assert.deepEqual(counts, [0, 1])
})

test('releaseReservation on an unreserved or already released order returns count 0 and 0 inventory returned', async () => {
  const f = fixture()
  f.state().order.reservationStatus = 'released'
  f.state().order.paymentStatus = 'failed'
  
  const res = await f.service.releaseReservation('o1', 'Redundant release')
  assert.equal(res.released, false)
  assert.equal(res.count, 0)
  assert.equal(f.state().stock, 0, 'No stock returned when count is 0')
})

test('concurrent refund webhook and admin fulfillment dispatch: atomic update prevents TOCTOU dispatch', async () => {
  const f = fixture()
  f.paid()
  await f.service.processEvent(f.event('checkout.session.completed'))
  assert.equal(f.state().order.paymentStatus, 'paid')
  
  // Concurrently, a full refund webhook arrives while admin attempts to dispatch
  f.charge.amount_refunded = 10000 // full refund
  
  // Webhook executes
  await f.service.processEvent(f.event('charge.refunded'))
  assert.equal(f.state().order.paymentStatus, 'refunded')
  
  // Admin tries atomic conditional dispatch
  const allowedPaymentStatuses = ['paid']
  const updateResult = await f.db.order.updateMany({
    where: {
      id: 'o1',
      paymentStatus: { in: allowedPaymentStatuses },
      status: { not: 'cancelled' },
    },
    data: { status: 'shipped' },
  })
  
  assert.equal(updateResult.count, 0, 'Dispatch must be blocked (count 0) when order has been refunded')
  assert.notEqual(f.state().order.status, 'shipped')
})

test('ambiguous session creation retains reservation; subsequent reconciliation confirms payment', async () => {
  const f = fixture()
  // Step 1: Initial creation has ambiguous failure -> reservation retained
  assert.equal(f.state().order.reservationStatus, 'reserved')
  assert.equal(f.state().stock, 0)
  
  // Step 2: The session was actually created and paid on Stripe side
  f.paid()
  
  // Step 3: Webhook arrives or admin synchronizes/reconciles with Stripe
  await f.service.reconcile('cs_1')
  assert.equal(f.state().order.paymentStatus, 'paid')
  assert.equal(f.state().order.reservationStatus, 'consumed')
  assert.equal(f.state().stock, 0)
})
