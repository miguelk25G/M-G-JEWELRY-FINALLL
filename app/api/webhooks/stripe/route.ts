import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import Stripe from "stripe"

export const runtime = "nodejs"

// Stripe requires the raw body to verify webhook signatures
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")
  const webhookSecret =
    process.env.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET

  let body: string
  try {
    body = await req.text()
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 })
  }

  let event: Stripe.Event
  const stripe = getStripe()

  if (webhookSecret) {
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message)
      return NextResponse.json(
        { error: `Webhook Signature Verification Failed: ${err.message}` },
        { status: 400 }
      )
    }
  } else {
    // If webhook secret is not set (e.g. initial setup test without webhook secret), parse payload safely
    try {
      event = JSON.parse(body) as Stripe.Event
      console.warn("[Stripe Webhook] Warning: Processing webhook without signature verification (stripe_webhook_secret not set).")
    } catch (err: any) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
  }

  const eventId = event.id
  const eventType = event.type

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.client_reference_id || session.metadata?.orderId

        if (!orderId) {
          console.warn("[Stripe Webhook] checkout.session.completed missing orderId:", session.id)
          return NextResponse.json({ received: true, note: "missing orderId" })
        }

        // Idempotency check: see if order / transaction is already succeeded
        const existingTx = await db.transaction.findFirst({
          where: {
            OR: [
              { providerId: session.id },
              { providerId: (session.payment_intent as string) || session.id },
              { orderId: orderId },
            ],
          },
        })

        if (existingTx && existingTx.status === "succeeded") {
          // Check if it already recorded this exact eventId or was already processed
          return NextResponse.json({ received: true, idempotent: true, note: "Already processed" })
        }

        const amountTotal = (session.amount_total || 0) / 100

        await db.$transaction(async (tx: any) => {
          // Update Order fulfillment status to "processing" (payment confirmed)
          const order = await tx.order.findUnique({
            where: { id: orderId },
          })

          if (order) {
            await tx.order.update({
              where: { id: orderId },
              data: {
                status: "processing",
                notes: order.notes
                  ? `${order.notes} | Paid via Stripe session ${session.id}`
                  : `Paid via Stripe session ${session.id}`,
              },
            })
          }

          // Update or create Transaction record
          if (existingTx) {
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: {
                status: "succeeded",
                amount: amountTotal || existingTx.amount,
                providerId: (session.payment_intent as string) || session.id,
                metadata: JSON.stringify({
                  sessionId: session.id,
                  paymentIntent: session.payment_intent,
                  eventId,
                  completedAt: new Date().toISOString(),
                }),
              },
            })
          } else {
            await tx.transaction.create({
              data: {
                orderId,
                provider: "stripe",
                providerId: (session.payment_intent as string) || session.id,
                status: "succeeded",
                amount: amountTotal,
                currency: session.currency?.toUpperCase() || "USD",
                metadata: JSON.stringify({
                  sessionId: session.id,
                  paymentIntent: session.payment_intent,
                  eventId,
                  completedAt: new Date().toISOString(),
                }),
              },
            })
          }
        })

        break
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.client_reference_id || session.metadata?.orderId

        if (!orderId) {
          return NextResponse.json({ received: true })
        }

        await db.$transaction(async (tx: any) => {
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true, transactions: true },
          })

          // Only cancel and restock if the order hasn't already been paid
          const isPaid = order?.transactions.some((t: any) => t.status === "succeeded")
          if (order && !isPaid && order.status !== "cancelled") {
            await tx.order.update({
              where: { id: orderId },
              data: {
                status: "cancelled",
                notes: order.notes
                  ? `${order.notes} | Session expired. Inventory restocked.`
                  : "Session expired. Inventory restocked.",
              },
            })

            // Update transaction to failed/expired
            const txRecord = order.transactions.find((t: any) => t.providerId === session.id)
            if (txRecord) {
              await tx.transaction.update({
                where: { id: txRecord.id },
                data: {
                  status: "failed",
                  metadata: JSON.stringify({ reason: "session_expired", eventId }),
                },
              })
            }

            // Explicit inventory restitution: restore reserved units
            for (const item of order.items) {
              if (item.productId) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    inventoryQty: { increment: item.quantity },
                  },
                })
              }
            }
          }
        })

        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata?.orderId

        await db.$transaction(async (tx: any) => {
          let order = null
          if (orderId) {
            order = await tx.order.findUnique({
              where: { id: orderId },
              include: { items: true, transactions: true },
            })
          } else {
            // Find by transaction providerId
            const txRecord = await tx.transaction.findFirst({
              where: { providerId: paymentIntent.id },
              include: { order: { include: { items: true } } },
            })
            if (txRecord) order = txRecord.order
          }

          if (order && order.status !== "cancelled" && !order.transactions.some((t: any) => t.status === "succeeded")) {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: "cancelled",
                notes: order.notes
                  ? `${order.notes} | Payment failed (${paymentIntent.last_payment_error?.message || 'declined'}). Inventory restocked.`
                  : `Payment failed. Inventory restocked.`,
              },
            })

            // Restock inventory explicitly
            for (const item of order.items) {
              if (item.productId) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    inventoryQty: { increment: item.quantity },
                  },
                })
              }
            }
          }
        })

        break
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent as string

        await db.$transaction(async (tx: any) => {
          const txRecord = await tx.transaction.findFirst({
            where: {
              OR: [
                { providerId: paymentIntentId },
                { providerId: charge.id },
              ],
            },
            include: { order: { include: { items: true } } },
          })

          if (txRecord) {
            await tx.transaction.update({
              where: { id: txRecord.id },
              data: {
                status: "refunded",
                metadata: JSON.stringify({
                  refundedAmount: (charge.amount_refunded || 0) / 100,
                  eventId,
                  refundedAt: new Date().toISOString(),
                }),
              },
            })

            await tx.order.update({
              where: { id: txRecord.orderId },
              data: {
                status: "refunded",
                notes: txRecord.order.notes
                  ? `${txRecord.order.notes} | Refunded via Stripe. Amount: $${(charge.amount_refunded || 0) / 100}. Inventory restocked.`
                  : `Refunded via Stripe. Inventory restocked.`,
              },
            })

            // Explicit inventory handling on refund: restore pieces to inventory
            for (const item of txRecord.order.items) {
              if (item.productId) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    inventoryQty: { increment: item.quantity },
                  },
                })
              }
            }
          }
        })

        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error processing event ${eventType}:`, err)
    return NextResponse.json(
      { error: "Webhook handler failed: " + err.message },
      { status: 500 }
    )
  }
}
