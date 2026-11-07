import { OrdersClient } from "./orders-client"
import { db } from "@/lib/db"

export default async function OrdersPage() {
  const dbOrders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, transactions: true },
  })

  // Format Prisma data into the shape expected by the UI table
  const formattedOrders = dbOrders.map((order: any) => {
    const hasSuccessfulTx = order.transactions.some((t: any) => t.status === "succeeded")
    const hasRefundedTx = order.transactions.some((t: any) => t.status === "refunded")
    const hasFailedTx = order.transactions.some((t: any) => t.status === "failed")

    let paymentStatus = "Pending"
    if (hasRefundedTx) paymentStatus = "Refunded"
    else if (hasSuccessfulTx) paymentStatus = "Paid"
    else if (hasFailedTx) paymentStatus = "Failed"

    if (order.stripeSessionId) paymentStatus = ({ paid: "Paid", pending: "Pending", failed: "Failed", refunded: "Refunded", partially_refunded: "Partially refunded" } as Record<string, string>)[order.paymentStatus] || "Pending"

    const latestTx = order.transactions[order.transactions.length - 1]

    let displayStatus = order.status
    if (order.status === "pending_concierge") {
      displayStatus = "Pending"
    } else if (order.status) {
      displayStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1)
    }

    const refundedDollars = (order.refundedAmount || 0) / 100
    const netAmount = Math.max(0, Math.round((order.total - refundedDollars) * 100) / 100)

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customerName,
      email: order.email,
      phone: order.phone || "",
      total: order.total,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      discount: order.discount,
      refundedAmount: refundedDollars,
      netAmount,
      shippingAddress: order.shippingAddress,
      notes: order.notes || "",
      items: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      itemsList: order.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
      })),
      status: displayStatus,
      payment: paymentStatus,
      paymentStatusRaw: order.paymentStatus,
      date: order.createdAt.toISOString().split("T")[0],
      provider: latestTx?.provider || (order.status === "pending_concierge" ? "concierge" : "stripe"),
      providerId: latestTx?.providerId || "",
    }
  })

  return <OrdersClient orders={formattedOrders} />
}
