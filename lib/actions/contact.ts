"use server"

import { db } from "@/lib/db"

export async function submitContactForm(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string || ""
    const reason = formData.get("reason") as string
    const message = formData.get("message") as string
    
    // Metadata block (like Style & Budget from quizzes)
    const budget = formData.get("budget") as string || ""
    const style = formData.get("style") as string || ""
    const metadata = budget || style ? JSON.stringify({ budget, style }) : null

    await db.contactSubmission.create({
      data: {
        name,
        email,
        phone,
        reason,
        message,
        metadata,
        status: "new"
      }
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: String(err) }
  }
}
