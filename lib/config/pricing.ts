/**
 * CHECKOUT PRICING & TAX CONFIGURATION
 * M&G Jewelry - Austin, Texas
 * 
 * Reglas de precios e impuestos con Stripe Tax:
 * 1. Origen del negocio: Austin, Texas.
 * 2. Envíos: Tarifa estándar fija de $25.00 USD en todos los pedidos de joyería.
 * 3. Impuestos: Cálculo automático y dinámico con Stripe Tax según la dirección de entrega en EE. UU.
 *    - Se elimina el cargo manual para evitar impuestos duplicados.
 *    - Stripe Tax determina la jurisdicción y la tasa exacta (incluyendo Texas y cualquier estado con nexo).
 * 4. Pagos directos: Habilitados para todos los destinos válidos de EE. UU.
 * 5. Cotizaciones personalizadas: Disponibles para pedidos personalizados o a medida (WhatsApp Concierge).
 */

export const CHECKOUT_PRICING_CONFIG = {
  status: "STRIPE_AUTOMATIC_TAX",
  validationNotice:
    "Cálculo automático con Stripe Tax para todos los destinos de EE. UU. Tarifa fija de envío estándar de $25.00 USD.",

  ORIGIN_CITY: "Austin",
  ORIGIN_STATE: "TX",
  DEFAULT_CURRENCY: "USD",
  STANDARD_SHIPPING_FEE: 25.0,
  STRIPE_MERCHANDISE_TAX_CODE: "txcd_99999999", // General - Tangible Goods / Jewelry
  STRIPE_SHIPPING_TAX_CODE: "txcd_92010001",    // Shipping
} as const

export interface ShippingAddressInput {
  street?: string | null
  apt?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
}

export interface OrderPricingBreakdown {
  rawSubtotal: number
  discountAmount: number
  discountedSubtotal: number
  shipping: number
  taxableBase: number
  taxRate: number
  tax: number
  total: number
  isTexas: boolean
  taxJurisdiction: string
  requiresQuoteOption: boolean
  allowsDirectPayment: boolean
}

/**
 * Valida si un país corresponde a Estados Unidos
 */
export function isUsAddress(country?: string | null): boolean {
  const cleanCountry = (country || "").trim().toUpperCase()
  return (
    !cleanCountry ||
    cleanCountry === "US" ||
    cleanCountry === "USA" ||
    cleanCountry === "UNITED STATES" ||
    cleanCountry === "ESTADOS UNIDOS"
  )
}

/**
 * Identifica si una dirección de destino corresponde al estado de Texas (EE. UU.)
 */
export function isTexasAddress(state?: string | null, country?: string | null): boolean {
  if (!state) return false
  if (!isUsAddress(country)) return false

  const cleanState = state.trim().toUpperCase()
  return cleanState === "TX" || cleanState === "TEXAS" || cleanState === "TEJAS"
}

export function calculateOrderTotals(params: {
  subtotal: number
  discountAmount?: number
  shippingAddress?: ShippingAddressInput | string | null
}): OrderPricingBreakdown {
  const rawSubtotal = Math.round(params.subtotal * 100) / 100
  const discountAmount = Math.max(0, Math.round((params.discountAmount || 0) * 100) / 100)
  const discountedSubtotal = Math.max(0, Math.round((rawSubtotal - discountAmount) * 100) / 100)
  
  // Tarifa estándar fija de $25 USD en todos los pedidos
  const shipping = CHECKOUT_PRICING_CONFIG.STANDARD_SHIPPING_FEE

  // Extraer estado y país si fueron suministrados
  let state: string | null = null
  let country: string | null = null

  if (params.shippingAddress) {
    if (typeof params.shippingAddress === "string") {
      try {
        const parsed = JSON.parse(params.shippingAddress)
        state = parsed.state || null
        country = parsed.country || null
      } catch {
        state = params.shippingAddress
      }
    } else {
      state = params.shippingAddress.state || null
      country = params.shippingAddress.country || null
    }
  }

  const isTexas = isTexasAddress(state, country)
  const isUs = isUsAddress(country)

  // Con Stripe Tax, el impuesto definitivo se calcula automáticamente en Stripe Checkout
  // según la dirección de entrega exacta. Inicialmente es 0 en el cálculo preliminar.
  const tax = 0
  const taxRate = 0
  const taxableBase = Math.round((discountedSubtotal + shipping) * 100) / 100
  const taxJurisdiction = "Stripe Automatic Tax (Destination-based)"

  const total = Math.round((discountedSubtotal + shipping + tax) * 100) / 100

  return {
    rawSubtotal,
    discountAmount,
    discountedSubtotal,
    shipping,
    taxableBase,
    taxRate,
    tax,
    total,
    isTexas,
    taxJurisdiction,
    requiresQuoteOption: false,
    allowsDirectPayment: isUs,
  }
}
