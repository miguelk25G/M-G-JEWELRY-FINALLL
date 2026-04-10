"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await db.order.update({
      where: { id: orderId },
      data: { status }
    })
    
    // Refresh the admin orders page so the table updates natively
    revalidatePath("/admin/orders")
    
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update status:", error)
    return { success: false, error: String(error.message || error) }
  }
}
