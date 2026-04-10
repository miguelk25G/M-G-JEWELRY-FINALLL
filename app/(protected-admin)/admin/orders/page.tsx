import { OrdersClient } from "./orders-client"
import { db } from "@/lib/db"

export default async function OrdersPage() {
  const dbOrders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true }
  })

  // Format Prisma data into the shape expected by the UI table
  const formattedOrders = dbOrders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customer: order.customerName,
    email: order.email,
    phone: order.phone || "",
    total: order.total,
    items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    status: order.status === "pending_concierge" ? "Pending" : order.status,
    payment: "Pending", // Concierge model implies payment is handled externally via WhatsApp
    date: order.createdAt.toISOString().split("T")[0],
  }))

  return <OrdersClient orders={formattedOrders} />
}
