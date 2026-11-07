"use server"

import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import { calculateOrderTotals } from "@/lib/config/pricing"
import Stripe from "stripe"
import { createPaymentService, assertSession, validateSize } from "@/lib/payments"

export interface CartItemInput {
  productId: string
  quantity: number
  size?: string
  id?: string
}

export interface CatalogItemDetails {
  productId: string
  name: string
  slug: string
  admitsSizes: boolean
  availableSizes: string[]
}

export interface CartItemCompatibilityIssue {
  cartItemId?: string
  productId: string
  name: string
  slug?: string
  type: 'has_no_sizes' | 'invalid_size' | 'missing_size' | 'unavailable'
  message: string
  availableSizes?: string[]
}

/**
 * Validates cart items against current database products before checkout.
 * Checks availability, builds catalog mapping, and flags any outdated/incompatible sizes.
 */
export async function checkCartItemsCompatibility(items: CartItemInput[]) {
  try {
    if (!items || items.length === 0) return { compatible: true, issues: [], catalogMap: {} }

    const productIds = items.map((i) => i.productId).filter(Boolean)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, nameEs: true, slug: true, sizes: true, isActive: true },
    })

    const pMap = new Map(products.map((p) => [p.id, p]))
    const issues: CartItemCompatibilityIssue[] = []
    const catalogMap: Record<string, CatalogItemDetails> = {}

    for (const p of products) {
      let sizes: string[] = []
      try {
        if (p.sizes) {
          const raw = JSON.parse(p.sizes)
          if (Array.isArray(raw)) sizes = raw.map(String).map((s) => s.trim()).filter(Boolean)
        }
      } catch {
        sizes = []
      }
      catalogMap[p.id] = {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        admitsSizes: sizes.length > 0,
        availableSizes: sizes,
      }
    }

    for (const item of items) {
      const p = pMap.get(item.productId)
      if (!p || !p.isActive) {
        issues.push({
          cartItemId: item.id,
          productId: item.productId,
          name: p?.name || item.productId,
          slug: p?.slug,
          type: 'unavailable',
          message: 'Product is unavailable',
        })
        continue
      }

      const catDetails = catalogMap[item.productId]
      const sizes = catDetails?.availableSizes || []

      if (sizes.length === 0 && item.size) {
        issues.push({
          cartItemId: item.id,
          productId: item.productId,
          name: p.name,
          slug: p.slug,
          type: 'has_no_sizes',
          message: 'This product has no selectable sizes.',
          availableSizes: [],
        })
      } else if (sizes.length > 0 && !item.size) {
        issues.push({
          cartItemId: item.id,
          productId: item.productId,
          name: p.name,
          slug: p.slug,
          type: 'missing_size',
          message: 'Select an available size.',
          availableSizes: sizes,
        })
      } else if (sizes.length > 0 && item.size && !sizes.includes(item.size)) {
        issues.push({
          cartItemId: item.id,
          productId: item.productId,
          name: p.name,
          slug: p.slug,
          type: 'invalid_size',
          message: `Size ${item.size} is not available.`,
          availableSizes: sizes,
        })
      }
    }

    return { compatible: issues.length === 0, issues, catalogMap }
  } catch (err) {
    console.error('checkCartItemsCompatibility error:', err)
    return { compatible: true, issues: [], catalogMap: {} }
  }
}

/**
 * Creates a Stripe Checkout Session with server-verified prices, inventory reservation,
 * and transactional concurrency protection against race conditions.
 */
export async function createStripeCheckoutSession(formData: FormData, cartItems: CartItemInput[]) {
  try {
    // Fail before reserving stock if payment notifications are not configured.
    getStripe()
    if (!(process.env.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET)) {
      return { success: false, error: "Los pagos están temporalmente deshabilitados. Contacta a la tienda." }
    }
    // 1. Extract and sanitize customer details
    const firstName = (formData.get("firstName") as string || "").trim()
    const lastName = (formData.get("lastName") as string || "").trim()
    const email = (formData.get("email") as string || "").trim().toLowerCase()
    const phonePrefix = (formData.get("phonePrefix") as string || "+1").trim()
    const phoneDigits = (formData.get("phoneDigits") as string || "").trim()
    const phone = phoneDigits ? `${phonePrefix} ${phoneDigits}` : null
    const address = (formData.get("address") as string || "").trim()
    const address2 = (formData.get("address2") as string || "").trim()
    const city = (formData.get("city") as string || "").trim()
    const state = (formData.get("state") as string || "").trim()
    const zip = (formData.get("zip") as string || "").trim()
    const country = (formData.get("country") as string || "US").trim()
    const appliedPromoCode = (formData.get("promoCode") as string || "").trim().toUpperCase()

    // Basic server validation
    if (!email || !firstName || !lastName || !address || !city || !state || !zip) {
      return { success: false, error: "Por favor completa todos los campos obligatorios de envío y contacto." }
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return { success: false, error: "Tu carrito de compras está vacío." }
    }

    // 2. Validate items structure & quantities
    for (const it of cartItems) {
      if (!it.productId || typeof it.quantity !== "number" || it.quantity <= 0 || !Number.isInteger(it.quantity)) {
        return { success: false, error: "Cantidades de producto inválidas en el carrito." }
      }
    }

    // Combine full address JSON
    const shippingAddressObj = {
      street: address,
      apt: address2 || null,
      city,
      state,
      zip,
      country,
    }
    const fullAddress = `${address} ${address2 ? address2 + ' ' : ''}${city}, ${state} ${zip}, ${country}`
    const customerName = `${firstName} ${lastName}`

    // 3. Database validation & transactional inventory reservation
    // To prevent race conditions where two concurrent buyers try to buy the last unit,
    // we atomically decrement inventoryQty inside db.$transaction with a conditional filter `inventoryQty >= requestedQty`.
    const reservationResult = await db.$transaction(async (tx: any) => {
      const productIds = cartItems.map((item) => item.productId)
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      })

      const productMap = new Map<string, any>(dbProducts.map((p: any) => [p.id, p]))

      // Verify each item
      const verifiedItems: {
        product: typeof dbProducts[0]
        quantity: number
        size?: string
        unitPrice: number
      }[] = []

      let rawSubtotal = 0

      for (const item of cartItems) {
        const product = productMap.get(item.productId)
        if (!product || !product.isActive) {
          throw new Error(`El producto seleccionado ya no está disponible.`)
        }

        try {
          validateSize(product, item.size)
        } catch (sizeErr: any) {
          const errWithMeta: any = new Error(sizeErr.message)
          errWithMeta.incompatibleProductId = product.id
          errWithMeta.incompatibleCartItemId = item.id
          throw errWithMeta
        }
        if (product.currency.toUpperCase() !== "USD" || !Number.isFinite(product.price) || product.price <= 0) throw new Error("Invalid product price or currency")

        // Atomically decrement inventory with strict condition: inventoryQty >= requested quantity
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            inventoryQty: { gte: item.quantity },
            isActive: true,
          },
          data: {
            inventoryQty: { decrement: item.quantity },
          },
        })

        if (updateResult.count === 0) {
          throw new Error(
            `No hay inventario suficiente para "${product.name}". (Disponibles: ${product.inventoryQty})`
          )
        }

        const unitPrice = product.price
        rawSubtotal += unitPrice * item.quantity

        verifiedItems.push({
          product,
          quantity: item.quantity,
          size: item.size,
          unitPrice,
        })
      }

      // Validate Promo / Discount code
      let discountAmount = 0
      let validPromoCode = ""

      if (appliedPromoCode) {
        const discountRecord = await tx.discountCode.findUnique({
          where: { code: appliedPromoCode },
        })

        if (discountRecord && discountRecord.isActive) {
          const isNotExpired = !discountRecord.expiresAt || new Date(discountRecord.expiresAt) > new Date()
          const hasUsesLeft = discountRecord.maxUses === null || discountRecord.usedCount < discountRecord.maxUses

          if (isNotExpired && hasUsesLeft) {
            if (discountRecord.discountType === "percentage") {
              discountAmount = rawSubtotal * (discountRecord.discountValue / 100)
            } else {
              discountAmount = Math.min(discountRecord.discountValue, rawSubtotal)
            }
            validPromoCode = discountRecord.code

            // Increment discount code usage
            await tx.discountCode.update({
              where: { id: discountRecord.id },
              data: { usedCount: { increment: 1 } },
            })
          }
        }
      }

      // Calculate totals using centralized pricing config
      const pricing = calculateOrderTotals({
        subtotal: rawSubtotal,
        discountAmount,
      })

      // Ensure customer User record exists
      let user = await tx.user.findUnique({ where: { email } })
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            name: customerName,
            role: "customer",
          },
        })
      }

      // Generate order number
      const orderNumber = `MG-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`

      // Create Order in DB
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          email,
          phone,
          subtotal: pricing.rawSubtotal,
          discount: pricing.discountAmount,
          tax: pricing.tax,
          shipping: pricing.shipping,
          total: pricing.total,
          currency: "USD",
          status: "pending",
          reservationStatus: "reserved",
          shippingAddress: JSON.stringify(shippingAddressObj),
          billingAddress: JSON.stringify(shippingAddressObj),
          notes: `Stripe Checkout pending${validPromoCode ? ` | Promo: ${validPromoCode}` : ''}`,
          items: {
            create: verifiedItems.map((vi) => ({
              productId: vi.product.id,
              name: vi.product.name,
              quantity: vi.quantity,
              price: vi.unitPrice,
              size: vi.size || null,
            })),
          },
        },
      })

      return {
        order,
        verifiedItems,
        pricing,
        validPromoCode,
      }
    })

    const { order, verifiedItems, pricing, validPromoCode } = reservationResult

    // 4. Create Stripe Checkout Session
    let session: Stripe.Checkout.Session
    try {
      const stripeInstance = getStripe()

      // Line items for products
      const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = verifiedItems.map((vi: any) => {
        let imageUrl: string | undefined = undefined
        try {
          const imgs = JSON.parse(vi.product.images)
          if (Array.isArray(imgs) && imgs[0]) imageUrl = imgs[0]
        } catch {
          // Ignore
        }

        return {
          price_data: {
            currency: (vi.product.currency || "USD").toLowerCase(),
            product_data: {
              name: vi.product.name,
              images: imageUrl ? [imageUrl] : undefined,
              description: vi.size ? `Size: ${vi.size}` : undefined,
            },
            unit_amount: Math.round(vi.unitPrice * 100),
          },
          quantity: vi.quantity,
        }
      })

      // Add sales tax line item if applicable (8% estimated)
      if (pricing.tax > 0) {
        line_items.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Estimated Sales Tax (8%)",
              description: "Standard state and local sales tax",
            },
            unit_amount: Math.round(pricing.tax * 100),
          },
          quantity: 1,
        })
      }

      // Apply coupon in Stripe if promo code applied
      let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined = undefined
      if (pricing.discountAmount > 0) {
        const coupon = await stripeInstance.coupons.create({
          amount_off: Math.round(pricing.discountAmount * 100),
          currency: "usd",
          duration: "once",
          name: `Promo Code: ${validPromoCode}`,
        })
        discounts = [{ coupon: coupon.id }]
      }

      // Base URL for redirects
      const hostUrl =
        process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

      session = await stripeInstance.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        client_reference_id: order.id,
        line_items,
        discounts,
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: {
                amount: Math.round(pricing.shipping * 100),
                currency: "usd",
              },
              display_name:
                pricing.shipping === 0
                  ? "Complimentary Fully Insured Delivery"
                  : "Standard Insured Jewelry Shipping",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 3 },
                maximum: { unit: "business_day", value: 5 },
              },
            },
          },
        ],
        success_url: `${hostUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${hostUrl}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
        payment_intent_data: { metadata: { orderId: order.id } },
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          promoCode: validPromoCode,
        },
      }, { idempotencyKey: `checkout-${order.id}` })
    } catch (stripeError: any) {
      console.error("[Stripe Checkout Error]", stripeError)

      // If Stripe rejected with a client error (e.g. invalid parameter), no session was created.
      // Release reserved inventory immediately so stock is not stranded.
      if (stripeError?.type === "StripeInvalidRequestError" || stripeError?.statusCode === 400) {
        await db.$transaction(async (tx: any) => {
          await tx.order.updateMany({
            where: { id: order.id, reservationStatus: "reserved" },
            data: { reservationStatus: "released", paymentStatus: "failed", status: "cancelled", notes: "Fallo de creación de sesión en Stripe" },
          })
          for (const vi of verifiedItems) {
            await tx.product.update({
              where: { id: vi.product.id },
              data: { inventoryQty: { increment: vi.quantity } },
            })
          }
        }).catch(() => {})
        return {
          success: false,
          error: "No se pudo generar la sesión de pago. Por favor verifica tus datos e intenta de nuevo.",
        }
      }

      // An ambiguous network failure may have created a payable session.
      // Retain its reservation for reconciliation instead of risking overselling.
      return {
        success: false,
        error: "No se pudo confirmar la sesión con Stripe. Si tu pago no se realiza, la reserva expirará automáticamente.",
      }
    }

    // 5. Create initial pending Transaction record linked to order
    try {
      await db.$transaction(async (tx: any) => {
        await tx.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } })
        await tx.transaction.create({
          data: {
            orderId: order.id,
            provider: "stripe",
            providerId: session.id,
            status: "pending",
            amount: pricing.total,
            currency: "USD",
            metadata: JSON.stringify({
              sessionId: session.id,
              orderNumber: order.orderNumber,
              stripeUrl: session.url,
              initiatedAt: new Date().toISOString(),
            }),
          },
        })
      })
    } catch (dbRegisterError: any) {
      console.error("[Order Registration Error] Failed to link Stripe session to DB:", dbRegisterError)
      // Attempt to immediately expire the newly created Stripe session to prevent stranded payments
      try {
        await getStripe().checkout.sessions.expire(session.id)
      } catch (expireErr) {
        console.error("Failed to expire dangling session:", expireErr)
      }
      // Release reserved stock so it doesn't remain locked
      await db.$transaction(async (tx: any) => {
        await tx.order.updateMany({
          where: { id: order.id, reservationStatus: "reserved" },
          data: { reservationStatus: "released", paymentStatus: "failed", status: "cancelled", notes: "Fallo de registro de transacción en base de datos" },
        })
        for (const vi of verifiedItems) {
          await tx.product.update({
            where: { id: vi.product.id },
            data: { inventoryQty: { increment: vi.quantity } },
          })
        }
      }).catch(() => {})

      return {
        success: false,
        error: "No se pudo registrar la sesión de pago. Por favor intenta de nuevo.",
      }
    }

    return {
      success: true,
      url: session.url,
      orderId: order.id,
      orderNumber: order.orderNumber,
    }
  } catch (err: any) {
    console.error("Create Stripe Checkout session error:", err)
    return {
      success: false,
      error: String(err.message || err),
      incompatibleProductId: err.incompatibleProductId as string | undefined,
      incompatibleCartItemId: err.incompatibleCartItemId as string | undefined,
    }
  }
}

/**
 * Verifies that a payment was confirmed by Stripe for the given session ID.
 * Returns order details to the success page.
 */
export async function verifyStripePayment(sessionId: string) {
  try {
    if (!sessionId) {
      return { success: false, error: "Missing session ID" }
    }

    const stripeInstance = getStripe()
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    })

    if (session.payment_status !== "paid") {
      return {
        success: false,
        error: "El pago aún no ha sido confirmado por Stripe.",
        paymentStatus: session.payment_status,
      }
    }

    const orderId = session.client_reference_id || session.metadata?.orderId

    let order = null
    if (orderId) {
      order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true, transactions: true },
      })
    } else {
      const tx = await db.transaction.findFirst({
        where: { providerId: session.id },
        include: { order: { include: { items: true, transactions: true } } },
      })
      if (tx) order = tx.order
    }

    if (!order) {
      return { success: false, error: "No se encontró el pedido correspondiente." }
    }

    assertSession(order, session)
    if (!["paid", "partially_refunded"].includes(order.paymentStatus)) {
      return { success: false, error: "Estamos confirmando el pedido. Actualiza esta página en unos segundos." }
    }

    let parsedAddress = null
    try {
      parsedAddress = JSON.parse(order.shippingAddress)
    } catch {
      parsedAddress = order.shippingAddress
    }

    return {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        email: order.email,
        total: order.total,
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        discount: order.discount,
        items: order.items,
        shippingAddress: parsedAddress,
        createdAt: order.createdAt,
      },
    }
  } catch (err: any) {
    console.error("Verify payment error:", err)
    return { success: false, error: String(err.message || err) }
  }
}

/**
 * Handles explicit cancellation when returning from Stripe Cancel URL.
 * Restocks reserved inventory and marks order cancelled.
 */
export async function cancelStripeCheckout(sessionId: string) {
  try {
    if (!sessionId) return { success: false }

    await createPaymentService(db, getStripe()).cancel(sessionId)
    return { success: true }
  } catch (err) {
    console.error("Cancel checkout error:", err)
    return { success: false }
  }
}

/**
 * Validates a promo discount code for checkout UI display.
 */
export async function applyPromoCode(code: string) {
  try {
    const codeStr = code.toUpperCase().trim()
    const discount = await db.discountCode.findUnique({ where: { code: codeStr } })

    if (!discount || !discount.isActive) {
      return { success: false, error: "El código no es válido o ha expirado." }
    }

    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return { success: false, error: "Este código de descuento ha expirado." }
    }

    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      return { success: false, error: "Este código ya alcanzó su límite de uso." }
    }

    return {
      success: true,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      code: discount.code,
    }
  } catch (err: any) {
    return { success: false, error: String(err) }
  }
}

/**
 * Backward compatibility: Concierge / White-Glove WhatsApp order flow.
 */
export async function submitConciergeOrder(formData: FormData, cartItems: any[]) {
  try {
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
    const appliedPromoCode = (formData.get("promoCode") as string) || ""

    const fullAddress = `${address} ${address2 ? address2 + " " : ""}${city}, ${state} ${zip}, ${country}`
    const customerName = `${firstName} ${lastName}`

    const validProducts = await db.product.findMany({
      where: {
        id: { in: cartItems.map((item) => item.productId) },
      },
    })

    const validCartItems = cartItems.filter((item) =>
      validProducts.some((p: any) => p.id === item.productId)
    )

    if (validCartItems.length === 0) {
      return {
        success: false,
        error: "Tus productos ya no se encuentran disponibles o la sesión expiró.",
      }
    }

    let subtotal = 0
    validCartItems.forEach((item) => {
      const prod = validProducts.find((p: any) => p.id === item.productId)
      subtotal += (prod?.price || item.price) * item.quantity
    })

    let discountAmount = 0
    let discountDisplay = ""

    if (appliedPromoCode) {
      const dbDiscount = await db.discountCode.findUnique({
        where: { code: appliedPromoCode.toUpperCase() },
      })
      if (dbDiscount && dbDiscount.isActive) {
        if (dbDiscount.discountType === "percentage") {
          discountAmount = subtotal * (dbDiscount.discountValue / 100)
          discountDisplay = `${dbDiscount.code} (-${dbDiscount.discountValue}%)`
        } else {
          discountAmount = dbDiscount.discountValue
          discountDisplay = `${dbDiscount.code} (-$${dbDiscount.discountValue})`
        }

        await db.discountCode.update({
          where: { id: dbDiscount.id },
          data: { usedCount: { increment: 1 } },
        })
      }
    }

    const totals = calculateOrderTotals({ subtotal, discountAmount })

    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: customerName,
          role: "customer",
        },
      })
    }

    const orderNumber = `CONCIERGE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`

    const order = await db.order.create({
      data: {
        orderNumber,
        customerName,
        email,
        phone,
        subtotal: totals.rawSubtotal,
        discount: totals.discountAmount,
        tax: totals.tax,
        shipping: totals.shipping,
        total: totals.total,
        status: "pending_concierge",
        shippingAddress: fullAddress,
        notes: "Concierge WhatsApp order",
        items: {
          create: validCartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null,
          })),
        },
      },
    })

    let waMessage = `✨ *New Concierge Order Request* ✨\n\n`
    waMessage += `*Order ID:* ${order.orderNumber}\n`
    waMessage += `*Customer:* ${customerName}\n`
    waMessage += `*Email:* ${email}\n`
    waMessage += `*Phone:* ${phone}\n\n`
    waMessage += `*Items:*\n`

    validCartItems.forEach((item) => {
      waMessage += `- ${item.quantity}x ${item.name} (${item.size || "N/A"}) - $${item.price}\n`
    })

    if (discountAmount > 0) {
      waMessage += `\n*Promo Applied:* ${discountDisplay} (-$${discountAmount.toFixed(2)})\n`
    }
    waMessage += `\n*Total:* $${totals.total.toFixed(2)}\n\n`
    waMessage += `Hello! I would like to acquire these exquisite pieces and arrange the payment.`

    const settings = await db.siteSettings.findUnique({ where: { id: "main" } })
    const waNumber = settings?.whatsappNumber?.replace(/\D/g, "") || "15125760229"

    const encodedText = encodeURIComponent(waMessage)
    const waLink = `https://wa.me/${waNumber}?text=${encodedText}`

    return { success: true, orderId: order.id, waLink }
  } catch (error: any) {
    console.error("Concierge checkout error:", error)
    return { success: false, error: String(error.message || error) }
  }
}
