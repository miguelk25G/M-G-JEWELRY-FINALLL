import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import { createPaymentService, createWebhookHandler } from "@/lib/payments"
export const runtime = "nodejs"
export const POST = createWebhookHandler(
 () => createPaymentService(db, getStripe()), getStripe,
 () => process.env.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET,
)
