"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdminSession } from "@/lib/actions/auth-helper"
import {
  createWhiteGloveService,
  type SubmitWhiteGloveInput,
  type WhiteGloveStatus,
} from "@/lib/white-glove"

function revalidateWhiteGloveAdminPaths() {
  revalidatePath("/admin/white-glove")
  revalidatePath("/admin")
}

/**
 * Public Server Action: Saves a White-Glove Quiz submission to the database,
 * sends business notification email, and (if email contact) sends customer confirmation email.
 */
export async function submitWhiteGloveQuizAction(
  input: Omit<SubmitWhiteGloveInput, "clientIp">
) {
  try {
    let clientIp: string | undefined
    try {
      const hdrs = await headers()
      const forwardedFor = hdrs.get("x-forwarded-for")
      clientIp =
        (forwardedFor ? forwardedFor.split(",")[0]?.trim() : undefined) ||
        hdrs.get("x-real-ip") ||
        undefined
    } catch {
      clientIp = undefined
    }

    const service = createWhiteGloveService(db)
    const result = await service.submitQuiz({
      ...input,
      clientIp,
    })

    revalidateWhiteGloveAdminPaths()

    return {
      success: true,
      submissionId: result.submissionId,
      deduplicated: result.deduplicated,
      preferredContact: result.request.preferredContact,
      contactDisplay: result.request.contactDisplay,
      submittedAt: result.request.createdAt,
      customerEmailStatus: result.request.notifications.customerEmail.status,
    }
  } catch (error: any) {
    console.error("[WhiteGlove] Submission failed:", error?.message || "Unknown error")
    return {
      success: false,
      error:
        error?.message ||
        "We could not submit your request right now. Please check your information and try again.",
    }
  }
}

/**
 * Admin-only Server Action: Updates the status and optional internal notes of a White-Glove request.
 */
export async function updateWhiteGloveStatusAction(input: {
  id: string
  status: WhiteGloveStatus
  adminNotes?: string
  orderId?: string
  channel?: import("@/lib/white-glove-shared").WhiteGloveContactMethod
  note?: string
}) {
  try {
    await requireAdminSession()
    const service = createWhiteGloveService(db)
    const updated = await service.updateRequestStatus(
      input.id,
      input.status,
      input.adminNotes,
      { orderId: input.orderId, channel: input.channel, note: input.note }
    )
    revalidateWhiteGloveAdminPaths()
    return {
      success: true,
      request: updated,
    }
  } catch (error: any) {
    console.error("[WhiteGlove] Status update failed:", error?.message || "Unknown error")
    return {
      success: false,
      error: error?.message || "Failed to update request status.",
    }
  }
}

/**
 * Admin-only Server Action: Retries failed or unconfigured email notifications for a White-Glove request
 * without sending duplicate emails for notifications that already succeeded.
 */
export async function retryWhiteGloveNotificationAction(id: string) {
  try {
    await requireAdminSession()
    const service = createWhiteGloveService(db)
    const updated = await service.retryNotifications(id)
    revalidateWhiteGloveAdminPaths()
    return {
      success: true,
      request: updated,
    }
  } catch (error: any) {
    console.error("[WhiteGlove] Notification retry failed:", error?.message || "Unknown error")
    return {
      success: false,
      error: error?.message || "Failed to retry email notifications.",
    }
  }
}
