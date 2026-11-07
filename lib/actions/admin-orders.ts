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

    if (order.paymentStatus === "refunded" && ["processing", "shipped", "completed", "delivered"].includes(status)) {
      throw new Error("No se puede despachar un pedido que ha sido totalmente reembolsado (Pago: Reembolsado).")
    }

    if (order.stripeSessionId) {
      if (status === "cancelled") {
        await createPaymentService(db, getStripe()).cancel(order.stripeSessionId)
      } else {
        if (!["processing", "shipped", "completed", "delivered"].includes(status) || order.paymentStatus !== "paid") throw new Error("Payment must be confirmed before fulfillment.")
        await db.order.update({ where: { id: orderId }, data: { status } })
      }
    } else {
      await db.order.update({ where: { id: orderId }, data: { status } })
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
