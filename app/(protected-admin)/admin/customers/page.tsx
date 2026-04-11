import { CustomersClient } from "./customers-client"
import { db } from "@/lib/db"

export default async function CustomersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" }
  })
  
  const customerMap = new Map<string, any>()

  for (const order of orders) {
    const email = order.email.toLowerCase()
    if (!customerMap.has(email)) {
      customerMap.set(email, {
        id: email, // use email as unique id
        name: order.customerName,
        email: email,
        orders: 0,
        totalSpent: 0,
        lastOrder: order.createdAt,
        status: "Active"
      })
    }
    
    const customer = customerMap.get(email)
    customer.orders += 1
    // Solo sumar si se pagó o asumimos total global gastado? Asumimos global por ahora de intenciones de compra
    customer.totalSpent += order.total
    if (new Date(order.createdAt) > new Date(customer.lastOrder)) {
      customer.lastOrder = order.createdAt
    }
  }

  const customers = Array.from(customerMap.values()).map(c => ({
    ...c,
    status: c.totalSpent > 5000 ? "VIP" : "Active",
    lastOrder: c.lastOrder.toISOString().split("T")[0]
  }))

  return <CustomersClient customers={customers} />
}
