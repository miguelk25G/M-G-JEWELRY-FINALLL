/**
 * CHECKOUT PRICING & TAX CONFIGURATION
 * 
 * Tarifa confirmada de envío estándar: $25 USD en todos los pedidos de joyería de lujo.
 * Se elimina la gratuidad a partir de $500 USD por decisión comercial.
 * 
 * 1. Envíos (Comercial): Tarifa fija estándar de $25.00 USD con entrega totalmente asegurada
 *    (Standard Insured Jewelry Shipping). La cotización dinámica de FedEx por peso, dimensiones
 *    de caja y destino queda pospuesta para una fase posterior.
 * 2. Impuestos (Fiscal): 8% de impuesto estimado preliminar.
 */

export const CHECKOUT_PRICING_CONFIG = {
  // Estado de validación
  status: "CONFIRMED_STANDARD_SHIPPING",
  validationNotice:
    "Tarifa de envío estándar confirmada en $25 USD para todos los pedidos. Impuestos estimados preliminares (8%).",

  // Parámetros numéricos
  ESTIMATED_TAX_RATE: 0.08,
  STANDARD_SHIPPING_FEE: 25.0,
  DEFAULT_CURRENCY: "USD",
} as const

export interface OrderPricingBreakdown {
  rawSubtotal: number
  discountAmount: number
  discountedSubtotal: number
  shipping: number
  tax: number
  total: number
}

export function calculateOrderTotals(params: {
  subtotal: number
  discountAmount?: number
}): OrderPricingBreakdown {
  const discountAmount = Math.max(0, Math.round((params.discountAmount || 0) * 100) / 100)
  const discountedSubtotal = Math.max(0, Math.round((params.subtotal - discountAmount) * 100) / 100)
  
  // Tarifa estándar de $25 USD en todos los pedidos
  const shipping = CHECKOUT_PRICING_CONFIG.STANDARD_SHIPPING_FEE
  const tax = Math.round(discountedSubtotal * CHECKOUT_PRICING_CONFIG.ESTIMATED_TAX_RATE * 100) / 100
  const total = Math.round((discountedSubtotal + shipping + tax) * 100) / 100

  return {
    rawSubtotal: Math.round(params.subtotal * 100) / 100,
    discountAmount,
    discountedSubtotal,
    shipping,
    tax,
    total,
  }
}
