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
    const appliedPromoCode = formData.get("promoCode") as string || ""

    // Combine full address
    const fullAddress = `${address} ${address2 ? address2 + ' ' : ''}${city}, ${state} ${zip}, ${country}`
    const customerName = `${firstName} ${lastName}`

    // Verify products exist and protect against ghost carts or deleted products
    const validProducts = await db.product.findMany({
      where: {
        id: { in: cartItems.map(item => item.productId) }
      }
    })

    const validCartItems = cartItems.filter(item => validProducts.some(p => p.id === item.productId))

    if (validCartItems.length === 0) {
      return { 
        success: false, 
        error: `Tus productos ya no se encuentran disponibles o la sesión expiró. \nDebug INFO:\ncartItems passed: ${JSON.stringify(cartItems)}\nIDs searched: ${JSON.stringify(cartItems.map(i => i.productId))}\nFound in DB: ${JSON.stringify(validProducts)}` 
      }
    }

    // Calculate cart total accurately 
    let subtotal = 0
    validCartItems.forEach((item) => {
      subtotal += item.price * item.quantity
    })
    
    // Process Discount
    let discountAmount = 0
    let discountDisplay = ""

    if (appliedPromoCode) {
      const dbDiscount = await db.discountCode.findUnique({ where: { code: appliedPromoCode.toUpperCase() } })
      if (dbDiscount && dbDiscount.isActive) {
        if (dbDiscount.discountType === 'percentage') {
          discountAmount = subtotal * (dbDiscount.discountValue / 100)
          discountDisplay = `${dbDiscount.code} (-${dbDiscount.discountValue}%)`
        } else {
          discountAmount = dbDiscount.discountValue
          discountDisplay = `${dbDiscount.code} (-$${dbDiscount.discountValue})`
        }
        
        // Increase used count safely
        await db.discountCode.update({
          where: { id: dbDiscount.id },
          data: { usedCount: { increment: 1 } }
        })
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount)
    const shipping = discountedSubtotal > 500 ? 0 : 25
    const tax = discountedSubtotal * 0.08
    const total = discountedSubtotal + shipping + tax

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
        discount: discountAmount,
        tax,
        shipping,
        total,
        status: "pending_concierge",
        shippingAddress: fullAddress,
        items: {
          create: validCartItems.map(item => ({
            productId: item.productId,
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
    waMessage += `*Order ID:* ${order.orderNumber}\n`
    waMessage += `*Customer:* ${customerName}\n`
    waMessage += `*Email:* ${email}\n`
    waMessage += `*Phone:* ${phone}\n\n`
    waMessage += `*Items:*\n`
    
    validCartItems.forEach(item => {
      waMessage += `- ${item.quantity}x ${item.name} (${item.size || 'N/A'}) - $${item.price}\n`
    })

    if (discountAmount > 0) {
      waMessage += `\n*Promo Applied:* ${discountDisplay} (-$${discountAmount.toFixed(2)})\n`
    }
    waMessage += `\n*Total:* $${total.toFixed(2)}\n\n`
    waMessage += `Hello! I would like to acquire these exquisite pieces and arrange the payment.`

    // Fetch dynamic WhatsApp Number from settings
    const settings = await db.siteSettings.findUnique({ where: { id: "main" } })
    const waNumber = settings?.whatsappNumber?.replace(/\D/g, '') || "15125760229"

    // URL Encode the WhatsApp Message
    const encodedText = encodeURIComponent(waMessage)
    const waLink = `https://wa.me/${waNumber}?text=${encodedText}`

    return { success: true, orderId: order.id, waLink }
  } catch (error: any) {
    console.error("Backend checkout error:", error)
    return { success: false, error: String(error.message || error) }
  }
}

export async function applyPromoCode(code: string) {
  try {
    const codeStr = code.toUpperCase().trim()
    const discount = await db.discountCode.findUnique({ where: { code: codeStr } })
    
    if (!discount || !discount.isActive) {
      return { success: false, error: "El código no es válido o ha expirado." }
    }
    
    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      return { success: false, error: "Este código ya alcanzó su límite de uso." }
    }

    return { 
      success: true, 
      discountType: discount.discountType, 
      discountValue: discount.discountValue,
      code: discount.code
    }
  } catch (err: any) {
    return { success: false, error: String(err) }
  }
}
