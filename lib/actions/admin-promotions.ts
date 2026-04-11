"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createDiscountCode(data: {
  code: string
  discountType: string
  discountValue: number
  maxUses: number | null
}) {
  try {
    const code = data.code.toUpperCase().trim()
    
    // Check if exists
    const existing = await db.discountCode.findUnique({ where: { code } })
    if (existing) {
      return { success: false, error: "Este código ya existe." }
    }

    await db.discountCode.create({
      data: {
        code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
      }
    })
    
    revalidatePath("/admin/promotions")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to create code:", error)
    return { success: false, error: String(error.message || error) }
  }
}

export async function toggleDiscountCode(codeId: string, isActive: boolean) {
  try {
    await db.discountCode.update({
      where: { id: codeId },
      data: { isActive }
    })
    revalidatePath("/admin/promotions")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: String(error.message || error) }
  }
}

export async function deleteDiscountCode(codeId: string) {
  try {
    await db.discountCode.delete({
      where: { id: codeId }
    })
    revalidatePath("/admin/promotions")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: String(error.message || error) }
  }
}
