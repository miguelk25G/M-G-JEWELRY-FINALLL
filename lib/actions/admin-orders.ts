"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/actions/auth-helper"
import { getStripe } from "@/lib/stripe"
import { createAdminOrderService } from "@/lib/admin-orders"

export type AdminActionResult = { success: true; error?: undefined } | { success: false; error: string }

// Server actions invoked by Next.js Admin interface
export async function updateOrderStatus(orderId: string, status: string): Promise<AdminActionResult> {
  try {
    await requireAdminSession()
    const service = createAdminOrderService(db, getStripe())
    await service.updateOrderStatus(orderId, status)
    revalidatePath("/admin/orders")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update status:", error)
    return { success: false, error: String(error.message || error) }
  }
}

export async function markOrderAsPaid(orderId: string, amount: number): Promise<AdminActionResult> {
  try {
    await requireAdminSession()
    const service = createAdminOrderService(db, getStripe())
    await service.markOrderAsPaid(orderId, amount)
    revalidatePath("/admin/orders")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to mark as paid:", error)
    return { success: false, error: String(error.message || error) }
  }
}

export async function syncOrderPaymentWithStripe(orderId: string): Promise<AdminActionResult> {
  try {
    await requireAdminSession()
    const service = createAdminOrderService(db, getStripe())
    await service.syncOrderPaymentWithStripe(orderId)
    revalidatePath("/admin/orders")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to sync Stripe payment:", error)
    return { success: false, error: String(error.message || error) }
  }
}
