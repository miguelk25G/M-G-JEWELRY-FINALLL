/**
 * CHECKOUT PRICING & TAX CONFIGURATION
 * M&G Jewelry - Austin, Texas
 * 
 * Reglas vigentes en Preview (pendientes de confirmación de tasa y permiso de sales tax de Texas):
 * 1. Origen: Austin, Texas.
 * 2. Envíos: Tarifa estándar fija de $25.00 USD en todos los pedidos de joyería de lujo.
 * 3. Entregas en Texas (TX):
 *    - Se aplica la tasa de prueba del 8.25% (6.25% Texas State Sales Tax + 2.00% Austin / Capital Metro local tax).
 *    - La base gravable INCLUYE el envío conforme a la normativa fiscal de Texas (Texas Tax Code § 151.007).
 *      Base gravable = (subtotal con descuento + costo de envío).
 *      Ejemplo: $100 joyería + $25 envío = $125 base * 8.25% = $10.31 impuesto. Total = $135.31 USD.
 * 4. Entregas fuera de Texas:
 *    - No se aplica impuesto de Texas (0.0%).
 *    - Como la obligación fiscal del estado de destino no está definida aún, se permite al cliente
 *      solicitar una cotización personalizada antes de pagar o proceder de forma segura.
 */

export const CHECKOUT_PRICING_CONFIG = {
  status: "PREVIEW_DESTINATION_BASED_TAX",
  validationNotice:
    "Cálculo de impuestos por destino en Preview: 8.25% en Texas (base: joyería + $25 envío) para establecimiento de Austin. Entregas fuera de Texas sin impuesto estatal de TX (cotización disponible).",

  ORIGIN_CITY: "Austin",
  ORIGIN_STATE: "TX",
  DEFAULT_CURRENCY: "USD",
  STANDARD_SHIPPING_FEE: 25.0,
  TEXAS_SALES_TAX_RATE: 0.0825, // 8.25% (Austin, TX: 6.25% estatal + 2.00% local)
  TEXAS_SHIPPING_TAXABLE: true,
  OUT_OF_STATE_TAX_RATE: 0.0,
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
}

/**
 * Identifica si una dirección de destino corresponde al estado de Texas (EE. UU.)
 */
export function isTexasAddress(state?: string | null, country?: string | null): boolean {
  if (!state) return false

  const cleanCountry = (country || "").trim().toUpperCase()
  const isUsCountry =
    !cleanCountry ||
    cleanCountry === "US" ||
    cleanCountry === "USA" ||
    cleanCountry === "UNITED STATES" ||
    cleanCountry === "ESTADOS UNIDOS"

  if (!isUsCountry) return false

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
        // Si no es JSON, asumir que la cadena recibida es directamente el estado
        state = params.shippingAddress
      }
    } else {
      state = params.shippingAddress.state || null
      country = params.shippingAddress.country || null
    }
  }

  const isTexas = isTexasAddress(state, country)

  let taxableBase = 0
  let taxRate = 0
  let tax = 0
  let taxJurisdiction = ""
  let requiresQuoteOption = false

  if (isTexas) {
    // En Texas, el flete/envío forma parte de la base imponible de bienes tangibles gravados
    taxableBase = Math.round((discountedSubtotal + shipping) * 100) / 100
    taxRate = CHECKOUT_PRICING_CONFIG.TEXAS_SALES_TAX_RATE
    tax = Math.round(taxableBase * taxRate * 100) / 100
    taxJurisdiction = "Texas (Austin Establishment - 8.25%)"
    requiresQuoteOption = false
  } else {
    // Entregas fuera de Texas: no se aplica impuesto de Texas
    taxableBase = 0
    taxRate = CHECKOUT_PRICING_CONFIG.OUT_OF_STATE_TAX_RATE
    tax = 0
    const stateLabel = state ? state.trim().toUpperCase() : "Out of State"
    taxJurisdiction = `Outside Texas (${stateLabel}) - No TX Tax`
    requiresQuoteOption = Boolean(state)
  }

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
    requiresQuoteOption,
  }
}
