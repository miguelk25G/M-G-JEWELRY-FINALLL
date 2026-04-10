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
  await db.product.delete({
    where: { id }
  })
  revalidatePath("/(protected-admin)/admin/products")
}
