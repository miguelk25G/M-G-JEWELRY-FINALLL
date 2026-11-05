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

    const latestTx = order.transactions[order.transactions.length - 1]

    let displayStatus = order.status
    if (order.status === "pending_concierge") {
      displayStatus = "Pending"
    } else if (order.status) {
      displayStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1)
    }

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
      date: order.createdAt.toISOString().split("T")[0],
      provider: latestTx?.provider || (order.status === "pending_concierge" ? "concierge" : "stripe"),
      providerId: latestTx?.providerId || "",
    }
  })

  return <OrdersClient orders={formattedOrders} />
}
