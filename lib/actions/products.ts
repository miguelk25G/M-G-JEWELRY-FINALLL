"use server"

import { db } from "@/lib/db"
import { put } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createProductAction(formData: FormData) {
  const name = formData.get("name") as string
  const nameEs = formData.get("nameEs") as string
  const description = formData.get("description") as string
  const descriptionEs = formData.get("descriptionEs") as string
  const price = parseFloat(formData.get("price") as string)
  const comparePrice = formData.get("comparePrice") ? parseFloat(formData.get("comparePrice") as string) : null
  const metalType = formData.get("metalType") as string
  const karat = formData.get("karat") as string
  const stoneType = formData.get("stoneType") as string
  const category = formData.get("category") as string
  const imageFile = formData.get("image") as File

  if (!name || !price || !category || !imageFile || imageFile.size === 0) {
    throw new Error("Missing required fields")
  }

  // Upload image to Vercel Blob
  const blob = await put(`products/${Date.now()}-${imageFile.name}`, imageFile, {
    access: "public",
  })

  // Create product in the database
  const product = await db.product.create({
    data: {
      name,
      nameEs: nameEs || null,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description,
      descriptionEs: descriptionEs || null,
      price,
      comparePrice,
      metalType,
      karat: karat || null,
      stoneType,
      category,
      images: JSON.stringify([blob.url]), // Assuming single image upload for now
      isActive: true,
      inventoryQty: 1, // Defaulting to 1 for manual listings
    },
  })

  revalidatePath("/(protected-admin)/admin/products")
  redirect("/admin/products")
}

export async function deleteProductAction(id: string) {
  try {
    // Check for active orders linked to this product
    const linkedItems = await db.orderItem.findMany({
      where: { productId: id },
      include: { order: true }
    })
    
    const hasActiveOrders = linkedItems.some(item => 
      item.order && 
      item.order.status !== "completed" && 
      item.order.status !== "cancelled" && 
      item.order.status !== "delivered" &&
      item.order.status !== "refunded"
    )
    
    if (hasActiveOrders) {
      throw new Error("Cannot delete product: It is linked to active (pending or processing) orders.")
    }

    try {
      await db.product.delete({
        where: { id }
      })
    } catch (dbError: any) {
      // If we hit a foreign key constraint (P2003) or any strict relation error, it means we must preserve order history.
      // So we do a "Soft Delete" by hiding it completely from the admin interface using a 'deleted-' prefix.
      await db.product.update({
        where: { id },
        data: { 
          isActive: false, 
          slug: `deleted-${id}-${Date.now()}` // Marks it as deleted for the query filter
        }
      })
    }

    revalidatePath("/admin/products")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete product:", error)
    if (error instanceof Error && error.message.includes("Cannot delete product")) {
      throw error // Re-throw the specific validation error so it reaches the client if needed
    }
    const dbErr = error?.message ? error.message : String(error)
    throw new Error("DB Exception: " + dbErr)
  }
}
