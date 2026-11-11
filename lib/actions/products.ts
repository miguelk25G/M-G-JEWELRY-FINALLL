"use server"

import { db } from "@/lib/db"
import { put } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdminSession } from "@/lib/actions/auth-helper"
import {
  createAdminProductService,
  type UpdateInventoryInput,
  type UpdateProductInput,
} from "@/lib/admin-products"
import {
  normalizeCategory,
  normalizeInventoryInput,
  parseImagesList,
  parseStringList,
  resolveRealProductSku,
} from "@/lib/inventory"

async function uploadImageFileSafe(file: File): Promise<string> {
  const safeName = (file.name || "jewelry.jpg").replace(/[^a-zA-Z0-9._-]/g, "-")
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`products/${Date.now()}-${safeName}`, file, {
        access: "public",
      })
      if (blob?.url) return blob.url
    } catch (blobErr) {
      console.warn("[ProductsAction] Vercel Blob upload failed, using inline fallback:", blobErr)
    }
  }
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const mime = file.type || "image/jpeg"
  return `data:${mime};base64,${base64}`
}

function revalidateStorefrontAndAdmin(slug?: string, categories: string[] = []) {
  revalidatePath("/admin/products")
  revalidatePath("/(protected-admin)/admin/products")
  revalidatePath("/admin")
  revalidatePath("/admin/promotions")
  revalidatePath("/")
  revalidatePath("/collections")
  revalidatePath("/collections/best-sellers")
  revalidatePath("/collections/diamond-rings")
  revalidatePath("/search")
  if (slug) {
    revalidatePath(`/product/${slug}`)
  }
  const uniqueCategories = Array.from(
    new Set([
      "rings",
      "necklaces",
      "earrings",
      "bracelets",
      "chains",
      ...categories.map((c) => normalizeCategory(c)),
    ])
  )
  for (const cat of uniqueCategories) {
    if (cat) revalidatePath(`/collections/${cat}`)
  }
}

export async function uploadProductImagesAction(formData: FormData) {
  try {
    await requireAdminSession()
    const files = formData.getAll("files") as File[]
    const validFiles = files.filter((f) => f && typeof f.size === "number" && f.size > 0)
    if (validFiles.length === 0) {
      const single = formData.get("file") as File | null
      if (single && single.size > 0) validFiles.push(single)
    }

    if (validFiles.length === 0) {
      return { success: false, error: "No image file provided." }
    }

    const uploadedUrls: string[] = []
    for (const file of validFiles) {
      const url = await uploadImageFileSafe(file)
      uploadedUrls.push(url)
    }

    return { success: true, urls: uploadedUrls }
  } catch (error: any) {
    console.error("Failed to upload product image:", error)
    return { success: false, error: String(error?.message || "Failed to upload image.") }
  }
}

export async function updateProductAction(input: UpdateProductInput) {
  try {
    await requireAdminSession()
    const service = createAdminProductService(db)
    const result = await service.updateProduct(input)

    revalidateStorefrontAndAdmin(result.product.slug, [
      result.product.category,
      result.previousCategory,
    ])

    return {
      success: true,
      product: result.product,
    }
  } catch (error: any) {
    console.error("Failed to update product:", error)
    return {
      success: false,
      error: String(error?.message || "Failed to save product changes."),
    }
  }
}

export async function updateProductInventoryAction(input: UpdateInventoryInput) {
  try {
    await requireAdminSession()
    const service = createAdminProductService(db)
    const result = await service.updateInventory(input)

    revalidateStorefrontAndAdmin(result.product.slug, [result.product.category])

    return {
      success: true,
      product: result.product,
    }
  } catch (error: any) {
    console.error("Failed to update product inventory:", error)
    return {
      success: false,
      error: String(error?.message || "Failed to update inventory."),
    }
  }
}

export async function toggleProductStatusAction(id: string, isActive: boolean) {
  try {
    await requireAdminSession()
    const service = createAdminProductService(db)
    const result = await service.setProductStatus(id, isActive)

    revalidateStorefrontAndAdmin(result.product.slug, [result.product.category])

    return {
      success: true,
      product: result.product,
    }
  } catch (error: any) {
    console.error("Failed to update product status:", error)
    return {
      success: false,
      error: String(error?.message || "Failed to update product status."),
    }
  }
}

export async function updateLowStockThresholdAction(threshold: number) {
  try {
    await requireAdminSession()
    const service = createAdminProductService(db)
    const result = await service.setGlobalLowStockThreshold(threshold)
    revalidatePath("/admin/products")
    return {
      success: true,
      lowStockThreshold: result.lowStockThreshold,
    }
  } catch (error: any) {
    console.error("Failed to update low-stock threshold:", error)
    return {
      success: false,
      error: String(error?.message || "Failed to update low-stock threshold."),
    }
  }
}

export async function createProductAction(formData: FormData) {
  await requireAdminSession()
  const name = (formData.get("name") as string || "").trim()
  const nameEs = (formData.get("nameEs") as string || "").trim()
  const description = (formData.get("description") as string || "").trim()
  const descriptionEs = (formData.get("descriptionEs") as string || "").trim()
  const price = parseFloat(formData.get("price") as string)
  const comparePrice = formData.get("comparePrice")
    ? parseFloat(formData.get("comparePrice") as string)
    : null
  const metalColor = (formData.get("metalColor") as string || formData.get("metalType") as string || "Yellow Gold").trim()
  const material = (formData.get("material") as string || formData.get("karat") as string || "").trim()
  const stoneType = (formData.get("stoneType") as string || "none").trim()
  const category = normalizeCategory(formData.get("category") as string)
  const skuInput = (formData.get("sku") as string || "").trim()
  const weightRaw = formData.get("weight") as string
  const lengthRaw = formData.get("length") as string
  const sizesRaw = formData.get("sizes") as string
  const stockMode = (formData.get("stockMode") as string || "limited").trim()
  const inventoryQtyRaw = formData.get("inventoryQty") ?? "1"
  const isActiveRaw = formData.get("isActive")
  const isActive = isActiveRaw === null ? true : isActiveRaw === "true" || isActiveRaw === "on"

  const imageFile = formData.get("image") as File | null
  const imageUrlsRaw = formData.get("imageUrls") as string | null

  const uploadedUrls: string[] = parseImagesList(imageUrlsRaw)
  if (imageFile && imageFile.size > 0) {
    const fileUrl = await uploadImageFileSafe(imageFile)
    uploadedUrls.unshift(fileUrl)
  }

  if (!name || !Number.isFinite(price) || price <= 0 || !category || uploadedUrls.length === 0) {
    throw new Error("Missing required fields")
  }

  const inventoryQty = normalizeInventoryInput(stockMode, inventoryQtyRaw as string)
  const sizesList = parseStringList(sizesRaw)
  const weight = weightRaw && !isNaN(parseFloat(weightRaw)) && parseFloat(weightRaw) > 0 ? parseFloat(weightRaw) : null
  const length = lengthRaw && !isNaN(parseFloat(lengthRaw)) && parseFloat(lengthRaw) > 0 ? parseFloat(lengthRaw) : null

  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `product-${Date.now()}`

  const existingSlug = await db.product.findUnique({ where: { slug: baseSlug } })
  const finalSlug = existingSlug ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug

  const product = await db.product.create({
    data: {
      name,
      nameEs: nameEs || null,
      slug: finalSlug,
      description,
      descriptionEs: descriptionEs || null,
      price,
      comparePrice,
      metalType: metalColor,
      karat: material || null,
      stoneType,
      category,
      images: JSON.stringify(uploadedUrls),
      isActive,
      inventoryQty,
      weight,
      length,
      sizes: sizesList.length > 0 ? JSON.stringify(sizesList) : null,
    },
  })

  const realSku = resolveRealProductSku(skuInput, finalSlug)
  if (realSku || material || metalColor) {
    const service = createAdminProductService(db)
    const metaStore = await service.getCatalogMetadata()
    metaStore.products[product.id] = {
      sku: realSku || undefined,
      material: material || undefined,
      metalColor: metalColor || undefined,
    }
    await service.saveCatalogMetadata(metaStore)
  }

  revalidateStorefrontAndAdmin(product.slug, [product.category])
  redirect("/admin/products")
}

export async function deleteProductAction(id: string) {
  try {
    await requireAdminSession()
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: "Product not found." }
    }

    // Check for active orders linked to this product comparing in lowercase
    const linkedItems = await db.orderItem.findMany({
      where: { productId: id },
      include: { order: true },
    })

    const hasActiveOrders = linkedItems.some((item) => {
      if (!item.order) return false
      const s = item.order.status.toLowerCase()
      return s !== "completed" && s !== "cancelled" && s !== "delivered" && s !== "refunded"
    })

    if (hasActiveOrders) {
      return {
        success: false,
        error: "Cannot delete product: It is linked to active (pending or processing) orders.",
      }
    }

    try {
      await db.product.delete({
        where: { id },
      })
    } catch {
      // Soft Delete fallback
      await db.product.update({
        where: { id },
        data: {
          isActive: false,
          slug: `deleted-${id}-${Date.now()}`,
        },
      })
    }

    revalidateStorefrontAndAdmin(existing.slug, [existing.category])
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete product:", error)
    return {
      success: false,
      error: String(error?.message || "Database exception occurred."),
    }
  }
}
