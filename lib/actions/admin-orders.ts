"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/actions/auth-helper"
import { getStripe } from "@/lib/stripe"

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await requireAdminSession()

    // Validate that orderId exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      return { success: false, error: "Order not found." }
    }

    // If order is cancelled from admin, handle inventory restock if not already cancelled
    if (status.toLowerCase() === "cancelled" && order.status.toLowerCase() !== "cancelled") {
      await db.$transaction(async (tx: any) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status },
        })

        // Restock inventory for items in cancelled order
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                inventoryQty: { increment: item.quantity },
              },
            })
          }
        }
      })
    } else {
      await db.order.update({
        where: { id: orderId },
        data: { status },
      })
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

    const stripeTx = order.transactions.find((t: any) => t.provider === "stripe")
    if (!stripeTx) {
      return { success: false, error: "No Stripe transaction associated with this order." }
    }

    const stripeInstance = getStripe()
    // providerId is either a session id (cs_...) or payment intent (pi_...)
    if (stripeTx.providerId.startsWith("cs_")) {
      const session = await stripeInstance.checkout.sessions.retrieve(stripeTx.providerId)
      if (session.payment_status === "paid") {
        await db.transaction.update({
          where: { id: stripeTx.id },
          data: { status: "succeeded" },
        })
        if (order.status === "pending" || order.status === "pending_concierge") {
          await db.order.update({
            where: { id: order.id },
            data: { status: "processing" },
          })
        }
      }
    } else if (stripeTx.providerId.startsWith("pi_")) {
      const pi = await stripeInstance.paymentIntents.retrieve(stripeTx.providerId)
      if (pi.status === "succeeded") {
        await db.transaction.update({
          where: { id: stripeTx.id },
          data: { status: "succeeded" },
        })
        if (order.status === "pending" || order.status === "pending_concierge") {
          await db.order.update({
            where: { id: order.id },
            data: { status: "processing" },
          })
        }
      }
    }

    revalidatePath("/admin/orders")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to sync Stripe payment:", error)
    return { success: false, error: String(error.message || error) }
  }
}
