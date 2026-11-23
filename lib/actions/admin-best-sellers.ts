"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/actions/auth-helper"
import {
  createBestSellersService,
  isValidDisplayMode,
  type BestSellersDisplayMode,
  type SaveBestSellersConfigInput,
} from "@/lib/best-sellers"

function revalidateBestSellersPaths() {
  revalidatePath("/")
  revalidatePath("/collections")
  revalidatePath("/collections/best-sellers")
  revalidatePath("/collections/chains")
  revalidatePath("/collections/bracelets")
  revalidatePath("/collections/earrings")
  revalidatePath("/collections/rings")
  revalidatePath("/collections/necklaces")
  revalidatePath("/collections/diamond-rings")
  revalidatePath("/search")
  revalidatePath("/admin")
  revalidatePath("/admin/best-sellers")
  revalidatePath("/admin/products")
}

export async function saveBestSellersConfigAction(input: SaveBestSellersConfigInput) {
  try {
    await requireAdminSession()

    if (!input || !isValidDisplayMode(input.mode)) {
      return {
        success: false,
        error: "Invalid display mode. Choose Manual, Automatic, or Hybrid.",
      }
    }

    if (!Array.isArray(input.manualProductIds)) {
      return {
        success: false,
        error: "Invalid M&G Picks selection payload.",
      }
    }

    const sanitizedIds = input.manualProductIds.map((id) => String(id || "").trim()).filter(Boolean)

    const service = createBestSellersService(db)
    const result = await service.saveConfig({
      mode: input.mode as BestSellersDisplayMode,
      manualProductIds: sanitizedIds,
    })

    revalidateBestSellersPaths()

    const refreshed = await service.getAdminDashboardData()
    return {
      success: true,
      config: result.config,
      data: refreshed,
    }
  } catch (error: any) {
    console.error("[AdminBestSellersAction] Failed to save configuration:", error)
    return {
      success: false,
      error: String(error?.message || "Failed to save Best Sellers settings."),
    }
  }
}

export async function refreshBestSellersDashboardAction() {
  try {
    await requireAdminSession()
    const service = createBestSellersService(db)
    const data = await service.getAdminDashboardData()
    return {
      success: true,
      data,
    }
  } catch (error: any) {
    console.error("[AdminBestSellersAction] Failed to refresh dashboard:", error)
    return {
      success: false,
      error: String(error?.message || "Failed to refresh Best Sellers data."),
    }
  }
}
