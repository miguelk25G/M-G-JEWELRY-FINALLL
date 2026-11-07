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
    })

    if (!order) {
      return { success: false, error: "Order not found." }
    }

    if (order.stripeSessionId) throw new Error("Use Stripe reconciliation for this order.")
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

      // Update order fulfillment status to processing if it was pending
      if (order.status === "pending" || order.status === "pending_concierge") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "processing" },
        })
      }
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

    if (!order.stripeSessionId) throw new Error("Legacy order requires manual reconciliation.")
    await createPaymentService(db, getStripe()).reconcile(order.stripeSessionId)

    revalidatePath("/admin/orders")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to sync Stripe payment:", error)
    return { success: false, error: String(error.message || error) }
  }
}
