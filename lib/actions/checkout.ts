"use server"

import { db } from "@/lib/db"

export async function submitConciergeOrder(formData: FormData, cartItems: any[]) {
  try {
    // Extract user details
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const email = formData.get("email") as string
    const phonePrefix = formData.get("phonePrefix") as string
    const phoneDigits = formData.get("phoneDigits") as string
    const phone = `${phonePrefix} ${phoneDigits}`
    const address = formData.get("address") as string
    const address2 = formData.get("address2") as string
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const zip = formData.get("zip") as string
    const country = formData.get("country") as string

    // Combine full address
    const fullAddress = `${address} ${address2 ? address2 + ' ' : ''}${city}, ${state} ${zip}, ${country}`
    const customerName = `${firstName} ${lastName}`

    // Calculate cart total accurately 
    let subtotal = 0
    cartItems.forEach((item) => {
      subtotal += item.price * item.quantity
    })
    
    const shipping = subtotal > 500 ? 0 : 25
    const tax = subtotal * 0.08
    const total = subtotal + shipping + tax

    // Create or Find User
    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: customerName,
          role: "customer",
        }
      })
    }

    // Create Order
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`

    const order = await db.order.create({
      data: {
        orderNumber: orderNumber,
        customerName: customerName,
        email: email,
        phone: phone,
        subtotal,
        total,
        status: "pending_concierge",
        shippingAddress: fullAddress,
        items: {
          create: cartItems.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null
          }))
        }
      }
    })

    // Format the WhatsApp Message string
    let waMessage = `✨ *New Concierge Order Request* ✨\n\n`
    waMessage += `*Order ID:* ${order.id.slice(-8).toUpperCase()}\n`
    waMessage += `*Customer:* ${customerName}\n`
    waMessage += `*Email:* ${email}\n`
    waMessage += `*Phone:* ${phone}\n\n`
    waMessage += `*Items:*\n`
    
    cartItems.forEach(item => {
      waMessage += `- ${item.quantity}x ${item.name} (${item.size || 'N/A'}) - $${item.price}\n`
    })

    waMessage += `\n*Total:* $${total.toFixed(2)}\n\n`
    waMessage += `Hello! I would like to acquire these exquisite pieces and arrange the payment.`

    // URL Encode the WhatsApp Message
    const encodedText = encodeURIComponent(waMessage)
    const waLink = `https://wa.me/15125760229?text=${encodedText}`

    return { success: true, orderId: order.id, waLink }
  } catch (error: any) {
    console.error("Backend checkout error:", error)
    return { success: false, error: String(error.message || error) }
  }
}

