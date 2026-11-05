/**
 * CHECKOUT PRICING & TAX CONFIGURATION
 * 
 * ⚠️ PENDIENTE DE VALIDACIÓN COMERCIAL Y FISCAL:
 * Los valores actuales (8% de impuesto estimado y $25 de costo de envío con gratuidad
 * para pedidos superiores a $500 USD) constituyen una parametrización de desarrollo.
 * 
 * PLAN DE CÁLCULO ANTES DEL LANZAMIENTO REAL EN PRODUCCIÓN:
 * 1. Impuestos (Fiscal): Se migrará a Stripe Tax (`automatic_tax: { enabled: true }`)
 *    para calcular de manera precisa y legal los impuestos estatales, condales y municipales
 *    en Estados Unidos y territorio internacional en base a la dirección de destino.
 * 2. Envíos (Comercial): Se conectará a tarifas dinámicas con empresas de logística de alta
 *    seguridad (FedEx / Brink's / Malca-Amit con seguro blindado para joyería de alto valor)
 *    o reglas escalonadas por peso y valor asegurado.
 */

export const CHECKOUT_PRICING_CONFIG = {
  // Estado de validación
  status: "PENDING_BUSINESS_AND_TAX_VALIDATION",
  validationNotice:
    "Configuración preliminar de impuestos (8%) y envío ($25, gratis > $500) pendiente de validación fiscal y comercial antes del despliegue final.",

  // Parámetros numéricos actuales
  ESTIMATED_TAX_RATE: 0.08,
  STANDARD_SHIPPING_FEE: 25.0,
  FREE_SHIPPING_THRESHOLD: 500.0,
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
  const shipping =
    discountedSubtotal >= CHECKOUT_PRICING_CONFIG.FREE_SHIPPING_THRESHOLD
      ? 0
      : CHECKOUT_PRICING_CONFIG.STANDARD_SHIPPING_FEE
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
