import { createPaymentService } from "@/lib/payments"

/**
 * Pure administrative order domain service.
 * Injected with db and stripe instances so tests run the exact production logic
 * without copying code or bypassing real execution constraints.
 */
export function createAdminOrderService(db: any, stripe: any) {
  async function updateOrderStatus(orderId: string, status: string) {
    status = status.toLowerCase()

    // Validate that orderId exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      throw new Error("Order not found.")
    }

    // Cancellation flow
    if (status === "cancelled") {
      if (order.stripeSessionId) {
        await createPaymentService(db, stripe).cancel(order.stripeSessionId)
      } else if (order.reservationStatus === "reserved" && order.paymentStatus === "pending") {
        await createPaymentService(db, stripe).releaseReservation(orderId, "Pedido cancelado por administración")
      } else {
        const res = await db.order.updateMany({
          where: { id: orderId, status: { not: "cancelled" } },
          data: { status: "cancelled" },
        })
        if (res.count === 0) throw new Error("El pedido ya está cancelado.")
      }
      return { success: true }
    }

    // Fulfillment flow: ["processing", "shipped", "completed", "delivered"]
    const fulfillmentStatuses = ["processing", "shipped", "completed", "delivered"]
    if (fulfillmentStatuses.includes(status)) {
      /**
       * POLÍTICA DE DESPACHO ANTE REEMBOLSOS Y DISPUTAS:
       * - Pedidos totalmente reembolsados (`paymentStatus: 'refunded'`): Despacho estrictamente bloqueado.
       * - Pedidos parcialmente reembolsados (`paymentStatus: 'partially_refunded'`):
       *   En alta joyería, un reembolso parcial representa una alteración financiera (e.g. devolución de un artículo
       *   o descuento post-venta). Por seguridad ante pérdidas, el despacho estándar requiere que el pago esté
       *   íntegramente confirmado (`paid`). Si la administración requiere despachar un pedido con reembolso parcial
       *   (ej. cortesía comercial), debe autorizarse explícitamente.
       * 
       * Actualización atómica condicional:
       * Para evitar condiciones de carrera (TOCTOU) con webhooks concurrentes de Stripe (`charge.refunded` o disputas),
       * actualizamos con `updateMany` filtrando id, estado actual y `paymentStatus: 'paid'`.
       */
      const allowedPaymentStatuses = ["paid"]

      const updated = await db.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: { in: allowedPaymentStatuses },
          status: { not: "cancelled" },
        },
        data: { status },
      })

      if (updated.count === 0) {
        // Inspect current order state to provide precise diagnostic error
        const currentOrder = await db.order.findUnique({ where: { id: orderId } })
        if (!currentOrder) throw new Error("Order not found.")
        if (currentOrder.paymentStatus === "refunded") {
          throw new Error("No se puede despachar: el pedido fue totalmente reembolsado.")
        }
        if (currentOrder.paymentStatus === "partially_refunded") {
          throw new Error("No se puede despachar automáticamente: el pedido tiene un reembolso parcial y requiere revisión administrativa.")
        }
        if (currentOrder.status === "cancelled") {
          throw new Error("No se puede despachar: el pedido está cancelado.")
        }
        throw new Error("No se puede actualizar el despacho: el pago debe estar confirmado ('paid') antes de despachar.")
      }

      return { success: true }
    }

    // Other non-fulfillment status updates (e.g. pending / on_hold)
    const updated = await db.order.updateMany({
      where: { id: orderId, status: { not: "cancelled" } },
      data: { status },
    })
    if (updated.count === 0) {
      throw new Error("No se pudo actualizar el estado del pedido.")
    }

    return { success: true }
  }

  async function markOrderAsPaid(orderId: string, amount: number) {
    return await db.$transaction(async (tx: any) => {
      // 1. Comprobar el estado vigente del pedido dentro de la transacción
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { transactions: true },
      })

      if (!currentOrder) {
        throw new Error("Order not found.")
      }

      // 2. Evitar que dos solicitudes registren el mismo pago
      if (currentOrder.paymentStatus === "paid") {
        throw new Error("El pedido ya se encuentra registrado como pagado.")
      }

      if (currentOrder.status === "cancelled" || currentOrder.paymentStatus === "refunded") {
        throw new Error("No se puede registrar un pago manual en un pedido cancelado o reembolsado.")
      }

      if (currentOrder.stripeSessionId) {
        throw new Error("Use Stripe reconciliation for this order.")
      }

      // 3. Regla estricta: un pedido con reserva de Stripe pendiente de conciliación
      // debe quedar fuera del flujo de pago manual.
      const hasStripePendingReservation =
        currentOrder.reservationStatus === "reserved" &&
        (
          (currentOrder.notes && currentOrder.notes.toLowerCase().includes("stripe")) ||
          currentOrder.transactions?.some((t: any) => t.provider === "stripe")
        )

      if (hasStripePendingReservation) {
        throw new Error(
          "Este pedido tiene una reserva de Stripe pendiente de conciliación. Debe conciliarse con Stripe o liberarse antes de aplicar un pago manual."
        )
      }

      // 4. Actualización condicional atómica para blindar contra carreras concurrentes
      const nextStatus =
        currentOrder.status === "pending" || currentOrder.status === "pending_concierge"
          ? "processing"
          : currentOrder.status

      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: { not: "paid" },
          status: { not: "cancelled" },
        },
        data: {
          paymentStatus: "paid",
          reservationStatus: currentOrder.reservationStatus === "reserved" ? "consumed" : currentOrder.reservationStatus,
          status: nextStatus,
        },
      })

      if (updated.count === 0) {
        throw new Error("El pedido ya fue marcado como pagado por otra solicitud concurrente.")
      }

      // 5. Registrar la transacción administrativa
      await tx.transaction.create({
        data: {
          orderId,
          provider: "manual_admin",
          providerId: `MANUAL-${Date.now()}`,
          status: "succeeded",
          amount,
          currency: currentOrder.currency || "USD",
          metadata: JSON.stringify({
            verifiedBy: "admin",
            timestamp: new Date().toISOString(),
          }),
        },
      })

      return { success: true }
    }, { isolationLevel: 'Serializable' })
  }

  async function syncOrderPaymentWithStripe(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { transactions: true },
    })

    if (!order) {
      throw new Error("Order not found.")
    }

    const paymentService = createPaymentService(db, stripe)
    let syncOutcome = {
      success: true,
      status: order.paymentStatus,
      orderStatus: order.status,
      message: "Estado sincronizado con Stripe.",
    }

    if (order.stripeSessionId) {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
      await paymentService.reconcile(order.stripeSessionId)

      const updatedOrder = await db.order.findUnique({ where: { id: orderId } })
      const isPaid = session.payment_status === "paid" ||
        (session.payment_status === "no_payment_required" && session.amount_total === 0)

      if (updatedOrder?.paymentStatus === "paid") {
        syncOutcome.message = "Pago confirmado en Stripe. Pedido actualizado a 'Pagado / En preparación'."
        syncOutcome.status = "paid"
      } else if (isPaid && updatedOrder?.paymentStatus !== "paid") {
        syncOutcome.message = "El pago está confirmado en Stripe, pero la confirmación en base de datos requiere revisión manual."
        syncOutcome.status = "review_required"
      } else if (session.status === "expired" || updatedOrder?.status === "cancelled") {
        syncOutcome.message = "La sesión de Stripe expiró sin pago. El pedido fue cancelado y el inventario liberado."
        syncOutcome.status = "cancelled"
      } else if (session.status === "open") {
        syncOutcome.message = "La sesión en Stripe sigue abierta y pendiente de pago por el cliente."
        syncOutcome.status = "pending"
      } else if (updatedOrder?.paymentStatus === "refunded") {
        syncOutcome.message = "El pedido fue totalmente reembolsado en Stripe."
        syncOutcome.status = "refunded"
      } else if (updatedOrder?.paymentStatus === "partially_refunded") {
        syncOutcome.message = "El pedido tiene un reembolso parcial registrado en Stripe."
        syncOutcome.status = "partially_refunded"
      } else {
        syncOutcome.message = `Sincronización completada. Estado de pago: ${updatedOrder?.paymentStatus || "pendiente"}.`
        syncOutcome.status = updatedOrder?.paymentStatus || "pending"
      }
    } else {
      let candidateSession: any = null
      try {
        const searchList = await stripe.checkout.sessions.list({ limit: 10 })
        candidateSession = searchList.data.find(
          (s: any) => s.client_reference_id === order.id || s.metadata?.orderId === order.id
        )
      } catch (searchErr) {
        console.error("Error searching Stripe sessions for orphan order:", searchErr)
      }

      if (candidateSession) {
        const recoverRes = await paymentService.recoverOrphanSession(order.id, candidateSession)
        const updatedOrder = await db.order.findUnique({ where: { id: orderId } })
        if (recoverRes.reconciled && updatedOrder?.paymentStatus === "paid") {
          syncOutcome.message = "Sesión huérfana vinculada y pago confirmado en Stripe. Pedido en preparación."
          syncOutcome.status = "paid"
        } else if (recoverRes.status === "review_required" || (candidateSession.payment_status === "paid" && updatedOrder?.paymentStatus !== "paid")) {
          syncOutcome.message = "Sesión vinculada, pero el pago en Stripe requiere revisión administrativa."
          syncOutcome.status = "review_required"
        } else if (candidateSession.status === "expired") {
          syncOutcome.message = "Sesión vinculada pero expirada sin pago. Pedido cancelado y stock liberado."
          syncOutcome.status = "cancelled"
        } else if (candidateSession.status === "open") {
          syncOutcome.message = "Sesión vinculada exitosamente. Sigue abierta y pendiente de pago por el cliente."
          syncOutcome.status = "pending"
        } else {
          syncOutcome.message = `Sesión vinculada. Estado: ${candidateSession.status}.`
          syncOutcome.status = candidateSession.status
        }
      } else {
        throw new Error("No se encontró una sesión de Stripe vinculada a este pedido. Requiere conciliación manual.")
      }
    }

    return syncOutcome
  }

  async function restockOrderInventory(orderId: string, reason?: string) {
    const paymentService = createPaymentService(db, stripe)
    return await paymentService.restockOrderInventory(orderId, reason)
  }

  return { updateOrderStatus, markOrderAsPaid, syncOrderPaymentWithStripe, restockOrderInventory }
}
