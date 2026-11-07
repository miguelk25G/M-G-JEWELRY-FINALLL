"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/actions/auth-helper"
import { createPaymentService } from "@/lib/payments"
import { getStripe } from "@/lib/stripe"

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await requireAdminSession()
    status = status.toLowerCase()

    // Validate that orderId exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      return { success: false, error: "Order not found." }
    }

    // Cancellation flow
    if (status === "cancelled") {
      if (order.stripeSessionId) {
        await createPaymentService(db, getStripe()).cancel(order.stripeSessionId)
      } else {
        const res = await db.order.updateMany({
          where: { id: orderId, status: { not: "cancelled" } },
          data: { status: "cancelled" },
        })
        if (res.count === 0) throw new Error("El pedido ya está cancelado.")
      }
      revalidatePath("/admin/orders")
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
        if (currentOrder?.paymentStatus === "refunded") {
          throw new Error("No se puede despachar: el pedido fue totalmente reembolsado.")
        }
        if (currentOrder?.paymentStatus === "partially_refunded") {
          throw new Error("No se puede despachar automáticamente: el pedido tiene un reembolso parcial y requiere revisión administrativa.")
        }
        if (currentOrder?.status === "cancelled") {
          throw new Error("No se puede despachar: el pedido está cancelado.")
        }
        throw new Error("No se puede actualizar el despacho: el pago debe estar confirmado ('paid') antes de despachar.")
      }

      revalidatePath("/admin/orders")
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

    revalidatePath("/admin/orders")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update status:", error)
    return { success: false, error: String(error.message || error) }
  }
}

export async function markOrderAsPaid(orderId: string, amount: number) {
  try {
    await requireAdminSession()

    // Check if order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { transactions: true },
    })

    if (!order) {
      return { success: false, error: "Order not found." }
    }

    if (order.stripeSessionId) {
      throw new Error("Use Stripe reconciliation for this order.")
    }

    // Regla estricta: un pedido con reserva de Stripe pendiente de conciliación
    // debe quedar fuera del flujo de pago manual.
    const hasStripePendingReservation =
      order.reservationStatus === "reserved" &&
      (
        (order.notes && order.notes.toLowerCase().includes("stripe")) ||
        order.transactions?.some((t: any) => t.provider === "stripe")
      )

    if (hasStripePendingReservation) {
      throw new Error(
        "Este pedido tiene una reserva de Stripe pendiente de conciliación. Debe conciliarse con Stripe o liberarse antes de aplicar un pago manual."
      )
    }

    if (order.status === "cancelled" || order.paymentStatus === "refunded") {
      throw new Error("No se puede registrar un pago manual en un pedido cancelado o reembolsado.")
    }

    await db.$transaction(async (tx: any) => {
      // Record manual administrative payment transaction
      await tx.transaction.create({
        data: {
          orderId,
          provider: "manual_admin",
          providerId: `MANUAL-${Date.now()}`,
          status: "succeeded",
          amount,
          currency: order.currency || "USD",
          metadata: JSON.stringify({
            verifiedBy: "admin",
            timestamp: new Date().toISOString(),
          }),
        },
      })

      // Update order fulfillment status to processing if it was pending or pending_concierge
      // Y actualizar paymentStatus a "paid" para permitir su posterior despacho atómico
      const nextStatus =
        order.status === "pending" || order.status === "pending_concierge"
          ? "processing"
          : order.status

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "paid",
          reservationStatus: order.reservationStatus === "reserved" ? "consumed" : order.reservationStatus,
          status: nextStatus,
        },
      })
    })

    revalidatePath("/admin/orders")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to mark as paid:", error)
    return { success: false, error: String(error.message || error) }
  }
}

/**
 * Syncs the latest payment status directly from Stripe API for an order.
 */
export async function syncOrderPaymentWithStripe(orderId: string) {
  try {
    await requireAdminSession()

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { transactions: true },
    })

    if (!order) {
      return { success: false, error: "Order not found." }
    }

    const stripeInstance = getStripe()
    const paymentService = createPaymentService(db, stripeInstance)

    if (order.stripeSessionId) {
      await paymentService.reconcile(order.stripeSessionId)
    } else {
      // Intento de recuperación de sesión huérfana en Stripe si no tiene stripeSessionId
      let candidateSession: any = null
      try {
        const searchList = await stripeInstance.checkout.sessions.list({ limit: 10 })
        candidateSession = searchList.data.find(
          (s: any) => s.client_reference_id === order.id || s.metadata?.orderId === order.id
        )
      } catch (searchErr) {
        console.error("Error searching Stripe sessions for orphan order:", searchErr)
      }

      if (candidateSession) {
        await paymentService.recoverOrphanSession(order.id, candidateSession)
      } else {
        throw new Error("No se encontró una sesión de Stripe vinculada a este pedido. Requiere conciliación manual.")
      }
    }

    revalidatePath("/admin/orders")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to sync Stripe payment:", error)
    return { success: false, error: String(error.message || error) }
  }
}
