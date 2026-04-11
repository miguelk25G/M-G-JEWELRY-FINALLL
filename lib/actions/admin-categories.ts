"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"

export async function createCategory(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const nameEs = formData.get("nameEs") as string
    const slug = formData.get("slug") as string
    const description = formData.get("description") as string
    const descriptionEs = formData.get("descriptionEs") as string
    const imageFile = formData.get("image") as File | null

    if (!name || !slug) throw new Error("Faltan atributos clave")

    const existing = await db.collection.findUnique({ where: { slug } })
    if (existing) {
      return { success: false, error: "Otra categoría ya usa este link (slug)." }
    }

    let imageUrl = null

    if (imageFile && imageFile.size > 0) {
      const blob = await put(`categories/${Date.now()}-${imageFile.name}`, imageFile, {
        access: "public",
      })
      imageUrl = blob.url
    }

    await db.collection.create({
      data: {
        name,
        nameEs: nameEs || null,
        slug,
        description: description || null,
        descriptionEs: descriptionEs || null,
        image: imageUrl,
      }
    })
    
    revalidatePath("/admin/categories")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: String(error.message || error) }
  }
}

export async function deleteCategory(id: string) {
  try {
    await db.collection.delete({
      where: { id }
    })
    revalidatePath("/admin/categories")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: "Error eliminando: " + String(error.message || error) }
  }
}

export async function toggleCategoryStatus(id: string, isActive: boolean) {
  try {
    await db.collection.update({
      where: { id },
      data: { isActive }
    })
    revalidatePath("/admin/categories")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: String(error.message || error) }
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    const name = formData.get("name") as string
    const nameEs = formData.get("nameEs") as string
    const slug = formData.get("slug") as string
    const description = formData.get("description") as string
    const descriptionEs = formData.get("descriptionEs") as string
    const imageFile = formData.get("image") as File | null

    const existing = await db.collection.findUnique({ where: { slug } })
    if (existing && existing.id !== id) {
      return { success: false, error: "Otra categoría ya usa este link (slug)." }
    }

    // Build the update payload dynamically
    const updateData: any = {
      name,
      nameEs: nameEs || null,
      slug,
      description: description || null,
      descriptionEs: descriptionEs || null,
    }

    if (imageFile && imageFile.size > 0) {
      const blob = await put(`categories/${Date.now()}-${imageFile.name}`, imageFile, {
        access: "public",
      })
      updateData.image = blob.url
    }

    await db.collection.update({
      where: { id },
      data: updateData
    })
    
    revalidatePath("/admin/categories")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: String(error.message || error) }
  }
}
