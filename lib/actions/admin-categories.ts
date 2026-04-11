"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createCategory(data: {
  name: string
  slug: string
  description?: string
  image?: string
}) {
  try {
    const existing = await db.collection.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return { success: false, error: "Otra categoría ya usa este link (slug)." }
    }

    await db.collection.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image: data.image || null,
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
