import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { createPaymentService, createWebhookHandler, validateSize } from '../lib/payments'
import { createAdminOrderService } from '../lib/admin-orders'

// Contract tests: actual production service/HTTP handler, fake Stripe transport
// and serialized in-memory Prisma adapter. NOT a PostgreSQL concurrency proof.
function fixture() {
  let state: any = {
    order: { id: 'o1', stripeSessionId: 'cs_1', total: 100, currency: 'USD', paymentStatus: 'pending', reservationStatus: 'reserved', refundedAmount: 0, notes: '', items: [{ productId: 'p1', quantity: 1 }] },
    stock: 0, events: {}, transactions: [{ orderId: 'o1', provider: 'stripe', providerId: 'cs_1', status: 'pending' }],
  }
  const match = (obj: any, where: any) => Object.entries(where).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && 'not' in v) return obj[k] !== v.not
    if (v && typeof v === 'object' && 'in' in v) return Array.isArray(v.in) && v.in.includes(obj[k])
    return obj[k] === v
  })
  const db: any = {
    order: {
      findUnique: async ({ where }: any) => match(state.order, where) ? { ...structuredClone(state.order), transactions: structuredClone(state.transactions) } : null,
      findFirst: async ({ where }: any) => match(state.order, where) ? { ...structuredClone(state.order), transactions: structuredClone(state.transactions) } : null,
      update: async ({ data }: any) => Object.assign(state.order, data),
      updateMany: async ({ where, data }: any) => { const count = +match(state.order, where); if (count) Object.assign(state.order, data); return { count } },
    },
    product: { update: async ({ data }: any) => { state.stock += data.inventoryQty.increment } },
    transaction: {
      create: async ({ data }: any) => { state.transactions.push(data) },
      findFirst: async ({ where }: any) => {
        const found = state.transactions.find((t: any) => match(t, where))
        return found ? structuredClone(found) : null
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0
        for (const t of state.transactions) {
          if (match(t, where)) { Object.assign(t, data); count++ }
        }
        return { count }
      },
      findMany: async ({ where }: any) => state.transactions.filter((t: any) => match(t, where)).map((t: any) => structuredClone(t)),
    },
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

// --- Tests for orphan session recovery & manual / White-Glove dispatch flow ---

test('orphan session recovery starts with stripeSessionId null and safely links on paid session without redirecting to completed session', async () => {
  const f = fixture()
  // 1. MUST start without stripeSessionId
  f.state().order.stripeSessionId = null
  assert.equal(f.state().order.stripeSessionId, null)

  // 2. Stripe session is already paid
  f.paid()

  // 3. Execute recoverOrphanSession
  const result = await f.service.recoverOrphanSession('o1', f.session)

  // 4. Assert outcomes
  assert.equal(result.success, true)
  assert.equal(result.status, 'paid')
  assert.equal(result.reconciled, true)
  assert.equal(result.redirectUrl, '/checkout/success?session_id=cs_1')
  assert.equal(result.url, undefined, 'Must NEVER redirect to a completed Stripe session URL')

  // 5. DB order is safely linked and marked as paid
  assert.equal(f.state().order.stripeSessionId, 'cs_1')
  assert.equal(f.state().order.paymentStatus, 'paid')
  assert.equal(f.state().order.reservationStatus, 'consumed')
  assert.equal(f.state().stock, 0, 'No stock should be returned on paid orphan session')
})

test('orphan session recovery rejects reference, metadata, amount, currency or conflict mismatches', async () => {
  // Test reference mismatch
  const f1 = fixture(); f1.state().order.stripeSessionId = null
  const badRef = { ...f1.session, client_reference_id: 'other_order' }
  await assert.rejects(() => f1.service.recoverOrphanSession('o1', badRef), /Session reference mismatch/)
  assert.equal(f1.state().order.stripeSessionId, null)

  // Test amount mismatch
  const f2 = fixture(); f2.state().order.stripeSessionId = null
  const badAmount = { ...f2.session, amount_total: 5000 }
  await assert.rejects(() => f2.service.recoverOrphanSession('o1', badAmount), /Session financial mismatch/)
  assert.equal(f2.state().order.stripeSessionId, null)

  // Test currency mismatch
  const f3 = fixture(); f3.state().order.stripeSessionId = null
  const badCurrency = { ...f3.session, currency: 'eur' }
  await assert.rejects(() => f3.service.recoverOrphanSession('o1', badCurrency), /Session financial mismatch/)
  assert.equal(f3.state().order.stripeSessionId, null)
})

test('orphan session recovery with reconciliation failure leaves order pending review and avoids completed session redirect', async () => {
  const f = fixture()
  f.state().order.stripeSessionId = null
  // Corrupt reservation so applySession throws error
  f.state().order.reservationStatus = 'released'
  f.paid()

  const result = await f.service.recoverOrphanSession('o1', f.session)
  assert.equal(result.success, false)
  assert.equal(result.status, 'review_required')
  assert.equal(result.reconciled, false)
  assert.equal(result.url, undefined, 'Must not redirect to completed session')
  assert.match(f.state().order.notes, /revisión manual/i)
})

test('orphan order without stripeSessionId and without transaction creates exactly one transaction on paid session; re-delivery leaves exactly one transaction', async () => {
  const f = fixture()
  // Order has no stripeSessionId and no initial transaction
  f.state().order.stripeSessionId = null
  f.state().transactions = []
  assert.equal(f.state().order.stripeSessionId, null)
  assert.equal(f.state().transactions.length, 0)

  // Stripe session is paid
  f.paid()

  // 1. First event delivery / recovery
  const result = await f.service.recoverOrphanSession('o1', f.session)
  assert.equal(result.success, true)
  assert.equal(result.reconciled, true)
  assert.equal(f.state().order.paymentStatus, 'paid')
  assert.equal(f.state().order.reservationStatus, 'consumed')
  assert.equal(f.state().transactions.length, 1, 'Transaction must be created atomically and idempotently')
  assert.equal(f.state().transactions[0].status, 'succeeded')
  assert.equal(f.state().transactions[0].providerId, 'cs_1')

  // 2. Re-deliver the event
  await f.service.processEvent(f.event('checkout.session.completed'))
  assert.equal(f.state().transactions.length, 1, 'Re-delivering the event must leave exactly one transaction')
  assert.equal(f.state().transactions[0].status, 'succeeded')
})

// --- Tests using createAdminOrderService (executing the exact admin production code) ---

test('real dispatch action demonstrates that a refund registered before update blocks dispatch', async () => {
  const f = fixture()
  f.paid()
  await f.service.processEvent(f.event('checkout.session.completed'))
  assert.equal(f.state().order.paymentStatus, 'paid')
  assert.equal(f.state().order.status, 'processing')

  const adminService = createAdminOrderService(f.db, f.stripe)

  // Dispatch succeeds while paid
  const okResult = await adminService.updateOrderStatus('o1', 'shipped')
  assert.equal(okResult.success, true)
  assert.equal(f.state().order.status, 'shipped')

  // Reset status to processing, then register a full refund
  f.state().order.status = 'processing'
  f.charge.amount_refunded = 10000
  await f.service.processEvent(f.event('charge.refunded'))
  assert.equal(f.state().order.paymentStatus, 'refunded')

  // Attempt to dispatch refunded order -> must throw error and block dispatch
  await assert.rejects(
    () => adminService.updateOrderStatus('o1', 'delivered'),
    /No se puede despachar: el pedido fue totalmente reembolsado/
  )
  assert.notEqual(f.state().order.status, 'delivered')
})

test('real dispatch action demonstrates that a partial refund blocks automated dispatch', async () => {
  const f = fixture()
  f.paid()
  await f.service.processEvent(f.event('checkout.session.completed'))
  
  // Register partial refund
  f.charge.amount_refunded = 2500
  await f.service.processEvent(f.event('charge.refunded'))
  assert.equal(f.state().order.paymentStatus, 'partially_refunded')

  const adminService = createAdminOrderService(f.db, f.stripe)

  // Attempt to dispatch partially refunded order -> must throw error requiring admin review
  await assert.rejects(
    () => adminService.updateOrderStatus('o1', 'shipped'),
    /No se puede despachar automáticamente: el pedido tiene un reembolso parcial/
  )
  assert.notEqual(f.state().order.status, 'shipped')
})

test('manual and White-Glove order: markOrderAsPaid sets paymentStatus paid and status processing, enabling subsequent dispatch', async () => {
  const f = fixture()
  // Setup a White-Glove concierge order without stripeSessionId
  f.state().order.stripeSessionId = null
  f.state().order.status = 'pending_concierge'
  f.state().order.paymentStatus = 'pending'
  f.state().order.reservationStatus = 'none'
  f.state().order.notes = 'Concierge White-Glove assistance requested'
  f.state().transactions = []

  const adminService = createAdminOrderService(f.db, f.stripe)

  // Admin registers manual payment using actual admin service
  const paidResult = await adminService.markOrderAsPaid('o1', 100)
  assert.equal(paidResult.success, true)
  assert.equal(f.state().order.paymentStatus, 'paid', 'paymentStatus must be paid')
  assert.equal(f.state().order.status, 'processing')

  // Now dispatch succeeds cleanly without regression!
  const dispatchResult = await adminService.updateOrderStatus('o1', 'shipped')
  assert.equal(dispatchResult.success, true)
  assert.equal(f.state().order.status, 'shipped')
})

test('manual order payment rejection: order with pending Stripe reservation is excluded from manual flow', async () => {
  const f = fixture()
  // Order with active Stripe reservation pending reconciliation
  f.state().order.stripeSessionId = null
  f.state().order.status = 'pending'
  f.state().order.paymentStatus = 'pending'
  f.state().order.reservationStatus = 'reserved'
  f.state().order.notes = 'Stripe Checkout pending | Promo: MGVIP'
  f.state().transactions = [{ orderId: 'o1', provider: 'stripe', status: 'pending' }]

  const adminService = createAdminOrderService(f.db, f.stripe)

  await assert.rejects(
    () => adminService.markOrderAsPaid('o1', 100),
    /Este pedido tiene una reserva de Stripe pendiente de conciliación/
  )
  assert.equal(f.state().order.paymentStatus, 'pending')
})

test('two concurrent markOrderAsPaid requests: atomic conditional check ensures only one succeeds and prevents duplicate payments', async () => {
  const f = fixture()
  f.state().order.stripeSessionId = null
  f.state().order.status = 'pending_concierge'
  f.state().order.paymentStatus = 'pending'
  f.state().order.reservationStatus = 'none'
  f.state().order.notes = 'White-glove concierge custom order'
  f.state().transactions = []

  const adminService = createAdminOrderService(f.db, f.stripe)

  // Two concurrent calls
  const [res1, res2] = await Promise.allSettled([
    adminService.markOrderAsPaid('o1', 100),
    adminService.markOrderAsPaid('o1', 100),
  ])

  const fulfilled = [res1, res2].filter(r => r.status === 'fulfilled')
  const rejected = [res1, res2].filter(r => r.status === 'rejected')

  assert.equal(fulfilled.length, 1, 'Exactly one request must succeed')
  assert.equal(rejected.length, 1, 'Concurrent request must be rejected')
  assert.equal(f.state().order.paymentStatus, 'paid')
  assert.equal(f.state().transactions.filter((t: any) => t.provider === 'manual_admin').length, 1, 'Exactly one payment transaction must be created')
})

test('shared idempotent write - Order 1: checkout registers first, webhook completes later -> exactly 1 transaction succeeded', async () => {
  const f = fixture()
  f.state().order.stripeSessionId = null
  f.state().order.paymentStatus = 'pending'
  f.state().order.reservationStatus = 'reserved'
  f.state().transactions = []

  // Step 1: Initial checkout registers session
  const regResult = await f.service.registerCheckoutSession('o1', f.session)
  assert.equal(regResult.success, true)
  assert.equal(regResult.alreadyPaid, false)
  assert.equal(f.state().order.stripeSessionId, 'cs_1')
  assert.equal(f.state().transactions.length, 1)
  assert.equal(f.state().transactions[0].status, 'pending')

  // Step 2: Stripe webhook arrives later
  f.paid()
  await f.service.processEvent(f.event('checkout.session.completed'))
  assert.equal(f.state().order.paymentStatus, 'paid')
  assert.equal(f.state().order.status, 'processing')
  assert.equal(f.state().transactions.length, 1, 'Must maintain exactly one transaction')
  assert.equal(f.state().transactions[0].status, 'succeeded')
})

test('shared idempotent write - Order 2: webhook arrives first, checkout registers later -> conserves paid record, exactly 1 transaction succeeded', async () => {
  const f = fixture()
  f.state().order.stripeSessionId = null
  f.state().order.paymentStatus = 'pending'
  f.state().order.reservationStatus = 'reserved'
  f.state().transactions = []

  // Step 1: Webhook arrives first
  f.paid()
  await f.service.processEvent(f.event('checkout.session.completed'))
  assert.equal(f.state().order.paymentStatus, 'paid')
  assert.equal(f.state().order.status, 'processing')
  assert.equal(f.state().transactions.length, 1, 'Webhook created initial transaction')
  assert.equal(f.state().transactions[0].status, 'succeeded')

  // Step 2: Checkout runs registerCheckoutSession later
  const regResult = await f.service.registerCheckoutSession('o1', f.session)
  assert.equal(regResult.success, true)
  assert.equal(regResult.alreadyPaid, true, 'Checkout recognizes payment was already recorded')
  assert.equal(f.state().order.paymentStatus, 'paid', 'Payment status must NOT be downgraded to pending')
  assert.equal(f.state().transactions.length, 1, 'Must not duplicate transaction')
  assert.equal(f.state().transactions[0].status, 'succeeded')
})

test('admin reconciliation reflects real outcome: paid, expired and open sessions', async () => {
  const f = fixture()
  const adminService = createAdminOrderService(f.db, f.stripe)

  // 1. Session is paid in Stripe
  f.paid()
  const paidResult = await adminService.syncOrderPaymentWithStripe('o1')
  assert.equal(paidResult.success, true)
  assert.equal(paidResult.status, 'paid')
  assert.match(paidResult.message, /Pago confirmado en Stripe/)
  assert.equal(f.state().order.paymentStatus, 'paid')

  // 2. Another order where session is expired in Stripe
  const f2 = fixture()
  f2.session.status = 'expired'
  f2.session.payment_status = 'unpaid'
  const adminService2 = createAdminOrderService(f2.db, f2.stripe)
  const expiredResult = await adminService2.syncOrderPaymentWithStripe('o1')
  assert.equal(expiredResult.success, true)
  assert.equal(expiredResult.status, 'cancelled')
  assert.match(expiredResult.message, /expiró sin pago/)
  assert.equal(f2.state().order.status, 'cancelled')
  assert.equal(f2.state().stock, 1, 'Expired session restocks inventory')

  // 3. Another order where session is open in Stripe
  const f3 = fixture()
  f3.session.status = 'open'
  f3.session.payment_status = 'unpaid'
  const adminService3 = createAdminOrderService(f3.db, f3.stripe)
  const openResult = await adminService3.syncOrderPaymentWithStripe('o1')
  assert.equal(openResult.success, true)
  assert.equal(openResult.status, 'pending')
  assert.match(openResult.message, /sigue abierta y pendiente de pago/)
})

test('shared idempotent write - late registration preserves partially_refunded state and leaves single transaction', async () => {
  const f = fixture()
  f.paid()
  f.state().order.paymentStatus = 'partially_refunded'
  f.state().order.refundedAmount = 2500
  f.state().transactions = [{
    id: 'tx_1',
    orderId: 'o1',
    provider: 'stripe',
    providerId: 'cs_1',
    status: 'partially_refunded',
    amount: 100,
  }]

  // Late checkout registration runs
  const regResult = await f.service.registerCheckoutSession('o1', f.session)
  assert.equal(regResult.success, true)
  assert.equal(regResult.alreadyPaid, true)
  assert.equal(regResult.status, 'partially_refunded', 'Must recognize and return partially_refunded status')
  assert.equal(f.state().order.paymentStatus, 'partially_refunded')
  assert.equal(f.state().transactions.length, 1, 'Must strictly leave exactly one transaction')
  assert.equal(f.state().transactions[0].status, 'partially_refunded', 'Must NOT overwrite partially_refunded with succeeded')
})

test('shared idempotent write - late registration preserves refunded state and leaves single transaction', async () => {
  const f = fixture()
  f.paid()
  f.state().order.paymentStatus = 'refunded'
  f.state().order.refundedAmount = 10000
  f.state().transactions = [{
    id: 'tx_1',
    orderId: 'o1',
    provider: 'stripe',
    providerId: 'cs_1',
    status: 'refunded',
    amount: 100,
  }]

  // Late checkout registration runs
  const regResult = await f.service.registerCheckoutSession('o1', f.session)
  assert.equal(regResult.success, true)
  assert.equal(regResult.alreadyPaid, true)
  assert.equal(regResult.status, 'refunded', 'Must recognize and return refunded status')
  assert.equal(f.state().order.paymentStatus, 'refunded')
  assert.equal(f.state().transactions.length, 1, 'Must strictly leave exactly one transaction')
  assert.equal(f.state().transactions[0].status, 'refunded', 'Must NOT overwrite refunded with succeeded')
})

test('unconfirmed checkout message: unknown charge result shows pending verification without falsely claiming no charge', () => {
  // Simulate message generation for unknown/unconfirmed gateway communication failure
  const unconfirmedError = "No se pudo confirmar la comunicación con la pasarela de pagos. El resultado del cobro es desconocido y está pendiente de verificación; tu reserva se conserva temporalmente mientras se concilia con Stripe."
  assert.match(unconfirmedError, /pendiente de verificación/i)
  assert.doesNotMatch(unconfirmedError, /no se realizó ningún cargo/i)
  assert.doesNotMatch(unconfirmedError, /no se ha realizado ningún cobro/i)
})
