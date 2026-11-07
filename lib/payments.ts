// Shared by webhook, cancellation and authenticated admin reconciliation.
// Database + Stripe are injected so tests execute this exact production logic.
export function validateSize(product: any, size?: string) {
  let sizes: unknown = []
  try { sizes = product.sizes ? JSON.parse(product.sizes) : [] }
  catch { throw new Error('Product size configuration is invalid.') }
  if (!Array.isArray(sizes)) throw new Error('Product size configuration is invalid.')
  if (sizes.length && (!size || !sizes.includes(size))) throw new Error('Select an available size.')
  if (!sizes.length && size) throw new Error('This product has no selectable sizes.')
}

export function assertSession(order: any, session: any) {
  if (!order || order.stripeSessionId !== session.id ||
      session.client_reference_id !== order.id || session.metadata?.orderId !== order.id ||
      session.amount_total !== Math.round(order.total * 100) ||
      session.currency?.toUpperCase() !== order.currency.toUpperCase()) {
    throw new Error('Checkout session does not match the stored order.')
  }
}

export function createPaymentService(db: any, stripe: any) {
  async function atomic(work: (tx: any) => Promise<any>) {
    for (let attempt = 0; ; attempt++) {
      try { return await db.$transaction(work, { isolationLevel: 'Serializable' }) }
      catch (e: any) {
        if (e.code !== 'P2034' || attempt >= 4) throw e
      }
    }
  }
  async function release(tx: any, order: any, reason?: string) {
    const data: any = { reservationStatus: 'released', paymentStatus: 'failed', status: 'cancelled' }
    if (reason) data.notes = reason
    const changed = await tx.order.updateMany({
      where: { id: order.id, reservationStatus: 'reserved', paymentStatus: 'pending' },
      data,
    })
    if (!changed.count) return
    for (const item of order.items) {
      if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { inventoryQty: { increment: item.quantity } } })
    }
    await tx.transaction.updateMany({ where: { orderId: order.id, provider: 'stripe', status: 'pending' }, data: { status: 'failed' } })
  }
  async function applySession(tx: any, session: any, releaseAllowed = false, reason?: string) {
    const order = await tx.order.findUnique({ where: { stripeSessionId: session.id }, include: { items: true } })
    assertSession(order, session)
    const paid = session.payment_status === 'paid' || (session.payment_status === 'no_payment_required' && session.amount_total === 0)
    if (paid) {
      if (['paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus)) return
      if (order.reservationStatus !== 'reserved') throw new Error('Paid order has no active reservation; manual reconciliation required.')
      const changed = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: 'pending', reservationStatus: 'reserved' },
        data: { paymentStatus: 'paid', reservationStatus: 'consumed', status: 'processing', stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id },
      })
      if (changed.count) await tx.transaction.updateMany({ where: { orderId: order.id, provider: 'stripe', providerId: session.id }, data: { status: 'succeeded' } })
    } else if (releaseAllowed) {
      await release(tx, order, reason)
    }
  }
  async function processEvent(event: any) {
    const supported = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'payment_intent.payment_failed', 'charge.refunded']
    if (!supported.includes(event.type)) return
    if (!event.id) throw new Error('Missing event ID')
    // Fetch authoritative current state before opening a short database transaction.
    let session: any
    let charge: any
    let asyncFailed = false
    if (event.type.startsWith('checkout.session.')) session = await stripe.checkout.sessions.retrieve(event.data.object.id)
    if (event.type === 'charge.refunded') charge = await stripe.charges.retrieve(event.data.object.id)
    if (session && event.type === 'checkout.session.async_payment_failed' && session.payment_status === 'unpaid' && session.status === 'complete') {
      const id = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
      const intent = id ? await stripe.paymentIntents.retrieve(id) : null
      asyncFailed = intent?.status === 'requires_payment_method' || intent?.status === 'canceled'
    }
    try {
      await atomic(async (tx) => {
        if (await tx.stripeEvent.findUnique({ where: { id: event.id } })) return
        await tx.stripeEvent.create({ data: { id: event.id, type: event.type } })
        if (session) {
          const releaseAllowed = session.status === 'expired' || asyncFailed
          const reason = asyncFailed
            ? 'Pago asíncrono fallido o rechazado'
            : (session.status === 'expired' ? 'Sesión de Stripe expirada por inactividad' : undefined)
          await applySession(tx, session, releaseAllowed, reason)
        } else if (charge) {
          const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
          if (!intentId) throw new Error('Refund missing payment intent')
          const order = await tx.order.findUnique({ where: { stripePaymentIntentId: intentId } })
          if (!order) throw new Error('Refund order not yet reconciled; retry required.')
          if (charge.currency.toUpperCase() !== order.currency || charge.amount !== Math.round(order.total * 100)) throw new Error('Refund amount or currency mismatch')
          const refunded = Math.max(order.refundedAmount, charge.amount_refunded)
          const status = refunded >= charge.amount ? 'refunded' : 'partially_refunded'
          await tx.order.update({ where: { id: order.id }, data: { refundedAmount: refunded, paymentStatus: status } })
          await tx.transaction.updateMany({ where: { orderId: order.id, provider: 'stripe' }, data: { status } })
          // A financial refund does not imply that physical goods were returned.
        }
        // payment_intent.payment_failed is an attempt failure, never a stock release.
      })
    } catch (e: any) {
      if (e.code === 'P2002' && await db.stripeEvent.findUnique({ where: { id: event.id } })) return
      throw e
    }
  }
  async function reconcile(sessionId: string) {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    await atomic(tx => applySession(tx, session, session.status === 'expired', 'Cancelación voluntaria por el cliente'))
  }
  async function cancel(sessionId: string) {
    const order = await db.order.findUnique({ where: { stripeSessionId: sessionId } })
    let session = await stripe.checkout.sessions.retrieve(sessionId)
    assertSession(order, session)
    if (session.status === 'open') {
      try { session = await stripe.checkout.sessions.expire(sessionId) }
      catch { session = await stripe.checkout.sessions.retrieve(sessionId) }
    }
    await atomic(tx => applySession(tx, session, session.status === 'expired', 'Cancelación voluntaria por el cliente'))
    if (session.status !== 'expired') throw new Error('Payment completed or still processing. Reservation retained.')
  }
  return { processEvent, reconcile, cancel }
}

export function createWebhookHandler(getService: () => any, getStripe: () => any, getSecret: () => string | undefined) {
  return async function POST(req: Request) {
    const secret = getSecret()
    if (!secret) return Response.json({ error: 'Webhook is not configured' }, { status: 503 })
    const signature = req.headers.get('stripe-signature')
    if (!signature) return Response.json({ error: 'Missing signature' }, { status: 400 })
    let event
    try { event = getStripe().webhooks.constructEvent(await req.text(), signature, secret) }
    catch { return Response.json({ error: 'Invalid signature' }, { status: 400 }) }
    try {
      await getService().processEvent(event)
      return Response.json({ received: true })
    } catch {
      return Response.json({ error: 'Webhook processing failed; retry required' }, { status: 500 })
    }
  }
}
