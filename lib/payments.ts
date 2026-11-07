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
    if (!changed.count) return { released: false, count: 0 }
    for (const item of order.items) {
      if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { inventoryQty: { increment: item.quantity } } })
    }
    await tx.transaction.updateMany({ where: { orderId: order.id, provider: 'stripe', status: 'pending' }, data: { status: 'failed' } })
    return { released: true, count: changed.count }
  }
  async function applySession(tx: any, session: any, releaseAllowed = false, reason?: string) {
    const order = await tx.order.findUnique({ where: { stripeSessionId: session.id }, include: { items: true } })
    assertSession(order, session)
    const paid = session.payment_status === 'paid' || (session.payment_status === 'no_payment_required' && session.amount_total === 0)
    if (paid) {
      if (['paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus)) {
        // Idempotently ensure transaction exists even if order was already confirmed
        const existingTx = await tx.transaction.findFirst({
          where: { orderId: order.id, provider: 'stripe', providerId: session.id },
        })
        if (!existingTx) {
          await tx.transaction.create({
            data: {
              orderId: order.id,
              provider: 'stripe',
              providerId: session.id,
              status: 'succeeded',
              amount: order.total,
              currency: order.currency || 'USD',
              metadata: JSON.stringify({
                sessionId: session.id,
                orderNumber: order.orderNumber,
                paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
                recoveredAt: new Date().toISOString(),
              }),
            },
          })
        }
        return
      }

      if (order.reservationStatus !== 'reserved') throw new Error('Paid order has no active reservation; manual reconciliation required.')
      const changed = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: 'pending', reservationStatus: 'reserved' },
        data: {
          paymentStatus: 'paid',
          reservationStatus: 'consumed',
          status: 'processing',
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
        },
      })

      if (changed.count) {
        const txUpdated = await tx.transaction.updateMany({
          where: { orderId: order.id, provider: 'stripe', providerId: session.id },
          data: { status: 'succeeded' },
        })
        if (txUpdated.count === 0) {
          const existingTx = await tx.transaction.findFirst({
            where: { orderId: order.id, provider: 'stripe', providerId: session.id },
          })
          if (!existingTx) {
            await tx.transaction.create({
              data: {
                orderId: order.id,
                provider: 'stripe',
                providerId: session.id,
                status: 'succeeded',
                amount: order.total,
                currency: order.currency || 'USD',
                metadata: JSON.stringify({
                  sessionId: session.id,
                  orderNumber: order.orderNumber,
                  paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
                  recoveredAt: new Date().toISOString(),
                }),
              },
            })
          }
        }
      }
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
          let order = await tx.order.findUnique({ where: { stripeSessionId: session.id }, include: { items: true } })
          if (!order && session.client_reference_id) {
            // Self-healing for orphan sessions arriving via webhook
            const orphanCandidate = await tx.order.findUnique({ where: { id: session.client_reference_id }, include: { items: true } })
            if (orphanCandidate && !orphanCandidate.stripeSessionId) {
              const matchesRef = orphanCandidate.id === session.client_reference_id && session.metadata?.orderId === orphanCandidate.id
              const matchesFin = session.amount_total === Math.round(orphanCandidate.total * 100) && session.currency?.toUpperCase() === orphanCandidate.currency.toUpperCase()
              const conflicting = await tx.order.findFirst({ where: { stripeSessionId: session.id, id: { not: orphanCandidate.id } } })
              if (matchesRef && matchesFin && !conflicting) {
                await tx.order.update({
                  where: { id: orphanCandidate.id },
                  data: {
                    stripeSessionId: session.id,
                    notes: (orphanCandidate.notes ? orphanCandidate.notes + ' | ' : '') + `Sesión huérfana ${session.id} vinculada por webhook`,
                  },
                })
                order = { ...orphanCandidate, stripeSessionId: session.id }
              }
            }
          }
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
  async function releaseReservation(orderId: string, reason?: string) {
    return await atomic(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } })
      if (!order) return { released: false, count: 0 }
      return await release(tx, order, reason)
    })
  }
  async function recoverOrphanSession(orderId: string, sessionOrId: any) {
    const session = typeof sessionOrId === 'string'
      ? await stripe.checkout.sessions.retrieve(sessionOrId)
      : sessionOrId

    return await atomic(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })
      if (!order) {
        throw new Error(`Order ${orderId} not found.`)
      }

      // 1. Validar que el pedido no tenga ya OTRA sesión distinta vinculada
      if (order.stripeSessionId && order.stripeSessionId !== session.id) {
        throw new Error(`Order ${orderId} already has a different linked session: ${order.stripeSessionId}`)
      }

      // 2. Validar que no exista OTRO pedido en BD con esta misma sesión vinculada
      const conflictingOrder = await tx.order.findFirst({
        where: {
          stripeSessionId: session.id,
          id: { not: order.id },
        },
      })
      if (conflictingOrder) {
        throw new Error(`Session ${session.id} is already linked to another order: ${conflictingOrder.id}`)
      }

      // 3. Validar referencia del pedido y metadatos
      const matchesReference =
        session.client_reference_id === order.id &&
        session.metadata?.orderId === order.id
      if (!matchesReference) {
        throw new Error(`Session reference mismatch: client_reference_id (${session.client_reference_id}) or metadata.orderId (${session.metadata?.orderId}) does not match order ${order.id}`)
      }

      // 4. Validar importe y moneda
      const matchesAmount = session.amount_total === Math.round(order.total * 100)
      const matchesCurrency = session.currency?.toUpperCase() === order.currency.toUpperCase()
      if (!matchesAmount || !matchesCurrency) {
        throw new Error(`Session financial mismatch: amount/currency (${session.amount_total} ${session.currency}) does not match order (${Math.round(order.total * 100)} ${order.currency})`)
      }

      // 5. Vincular de forma segura order.stripeSessionId = session.id si aún no estaba vinculado
      if (!order.stripeSessionId) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            stripeSessionId: session.id,
            notes: (order.notes ? order.notes + ' | ' : '') + `Sesión huérfana ${session.id} vinculada exitosamente`,
          },
        })
        order.stripeSessionId = session.id
      }

      // 6. Evaluar estado de pago en Stripe
      const isPaid =
        session.payment_status === 'paid' ||
        (session.payment_status === 'no_payment_required' && session.amount_total === 0)

      if (isPaid) {
        try {
          await applySession(tx, session, false)
          return {
            success: true,
            status: 'paid',
            reconciled: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            // Si el pago ya se hizo, evitar redirigir a una sesión ya completada en Stripe:
            // devolver la URL de confirmación de éxito de la tienda.
            redirectUrl: `/checkout/success?session_id=${session.id}`,
          }
        } catch (reconcileErr: any) {
          console.error(`[Orphan Recovery] Reconciliation failed for order ${order.id}:`, reconcileErr?.message || reconcileErr)
          await tx.order.update({
            where: { id: order.id },
            data: {
              notes: (order.notes ? order.notes + ' | ' : '') + `Conciliación fallida: ${reconcileErr?.message || 'Error desconocido'}. Pendiente de revisión manual.`,
            },
          })
          return {
            success: false,
            status: 'review_required',
            reconciled: false,
            error: 'El pago no pudo ser confirmado automáticamente. El pedido ha sido puesto en revisión administrativa.',
            orderId: order.id,
            orderNumber: order.orderNumber,
          }
        }
      }

      if (session.status === 'open') {
        return {
          success: true,
          status: 'open',
          reconciled: false,
          url: session.url,
          orderId: order.id,
          orderNumber: order.orderNumber,
        }
      }

      if (session.status === 'expired') {
        await release(tx, order, 'Sesión huérfana vinculada pero ya expirada')
        return {
          success: false,
          status: 'expired',
          reconciled: false,
          error: 'La sesión de pago en Stripe ha expirado. Por favor genera un nuevo pedido.',
          orderId: order.id,
          orderNumber: order.orderNumber,
        }
      }

      return {
        success: false,
        status: session.status,
        reconciled: false,
        error: `Estado de sesión no reconocido: ${session.status}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
      }
    })
  }

  async function registerCheckoutSession(orderId: string, session: any) {
    return await atomic(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, transactions: true },
      })
      if (!order) {
        throw new Error(`Order ${orderId} not found.`)
      }

      // Check for session ID conflict across different orders
      const conflicting = await tx.order.findFirst({
        where: { stripeSessionId: session.id, id: { not: order.id } },
      })
      if (conflicting) {
        throw new Error(`Stripe session ${session.id} is already linked to order ${conflicting.id}`)
      }

      // Validate matching financial amounts and references
      if (order.stripeSessionId && order.stripeSessionId !== session.id) {
        throw new Error(`Order ${order.id} already has a different linked session: ${order.stripeSessionId}`)
      }
      if (session.client_reference_id !== order.id || session.metadata?.orderId !== order.id) {
        throw new Error('Checkout session references do not match the stored order.')
      }
      if (session.amount_total !== Math.round(order.total * 100) ||
          session.currency?.toUpperCase() !== order.currency.toUpperCase()) {
        throw new Error('Checkout session amount or currency does not match the stored order.')
      }

      // Link session if not yet linked
      if (!order.stripeSessionId) {
        await tx.order.update({
          where: { id: order.id },
          data: { stripeSessionId: session.id },
        })
        order.stripeSessionId = session.id
      }

      // Check if webhook arrived FIRST and already recorded the payment
      const isPaidInOrder = ['paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus) ||
        ['processing', 'completed', 'shipped', 'delivered'].includes(order.status)

      const isPaidInSession = session.payment_status === 'paid' ||
        (session.payment_status === 'no_payment_required' && session.amount_total === 0)

      const existingTx = await tx.transaction.findFirst({
        where: { orderId: order.id, provider: 'stripe', providerId: session.id },
      })

      if (isPaidInOrder || isPaidInSession) {
        // Webhook arrived first or session was already completed!
        // Strictly conserve the payment record and its state: DO NOT downgrade to pending!
        if (!existingTx) {
          await tx.transaction.create({
            data: {
              orderId: order.id,
              provider: 'stripe',
              providerId: session.id,
              status: 'succeeded',
              amount: order.total,
              currency: order.currency || 'USD',
              metadata: JSON.stringify({
                sessionId: session.id,
                orderNumber: order.orderNumber,
                stripeUrl: session.url,
                paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
                recoveredAt: new Date().toISOString(),
              }),
            },
          })
        } else if (existingTx.status !== 'succeeded') {
          await tx.transaction.update({
            where: { id: existingTx.id },
            data: { status: 'succeeded' },
          })
        }

        // If order was not yet updated to paid in DB, apply session transition
        if (order.paymentStatus !== 'paid' && isPaidInSession) {
          await applySession(tx, session, false)
        }

        return {
          success: true,
          alreadyPaid: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
        }
      }

      // Normal initial checkout flow: create pending transaction idempotently if not already created
      if (!existingTx) {
        await tx.transaction.create({
          data: {
            orderId: order.id,
            provider: 'stripe',
            providerId: session.id,
            status: 'pending',
            amount: order.total,
            currency: order.currency || 'USD',
            metadata: JSON.stringify({
              sessionId: session.id,
              orderNumber: order.orderNumber,
              stripeUrl: session.url,
              initiatedAt: new Date().toISOString(),
            }),
          },
        })
      }

      return {
        success: true,
        alreadyPaid: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
      }
    })
  }

  return { processEvent, reconcile, cancel, releaseReservation, recoverOrphanSession, registerCheckoutSession }
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
