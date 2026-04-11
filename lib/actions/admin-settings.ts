"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function updateSiteSettings(formData: FormData) {
  try {
    const siteName = formData.get("siteName") as string
    const tagline = formData.get("tagline") as string
    const whatsappNumber = formData.get("whatsappNumber") as string
    const contactEmail = formData.get("contactEmail") as string
    const instagramUrl = formData.get("instagramUrl") as string
    const facebookUrl = formData.get("facebookUrl") as string
    const returnPolicy = formData.get("returnPolicy") as string

    // Use upsert to ensure it always exists as "main"
    await db.siteSettings.upsert({
      where: { id: "main" },
      update: {
        siteName,
        tagline,
        whatsappNumber,
        contactEmail,
        instagramUrl,
        facebookUrl,
        returnPolicy
      },
      create: {
        id: "main",
        siteName,
        tagline,
        whatsappNumber,
        contactEmail,
        instagramUrl,
        facebookUrl,
        returnPolicy
      }
    })

    revalidatePath("/") // revalidate layout paths depending on settings
    revalidatePath("/admin/settings")
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: String(err.message || err) }
  }
}
