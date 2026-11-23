import { GA_MEASUREMENT_ID, isExcludedAnalyticsPath } from './config'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
    __mgGa4Configured?: boolean
  }
}

/**
 * Standard GA4 Ecommerce Item schema.
 * https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */
export interface GA4EcommerceItem {
  item_id: string
  item_name: string
  item_brand?: string
  item_category?: string
  item_category2?: string
  item_variant?: string
  price: number
  quantity?: number
  currency?: string
  index?: number
  item_list_id?: string
  item_list_name?: string
}

export interface GA4ViewItemParams {
  currency?: string
  value: number
  items: GA4EcommerceItem[]
}

export interface GA4AddToCartParams {
  currency?: string
  value: number
  items: GA4EcommerceItem[]
}

export interface GA4RemoveFromCartParams {
  currency?: string
  value: number
  items: GA4EcommerceItem[]
}

export interface GA4ViewCartParams {
  currency?: string
  value: number
  items: GA4EcommerceItem[]
}

export interface GA4BeginCheckoutParams {
  currency?: string
  value: number
  coupon?: string
  items: GA4EcommerceItem[]
}

export interface GA4PurchaseParams {
  /**
   * Must only be `true` when backed by a server-verified completed payment
   * (e.g. Stripe Checkout Session paid & reconciled with the database).
   * Prevents accidental or speculative purchase event firing.
   */
  verifiedPayment: true
  transaction_id: string
  value: number
  currency?: string
  tax?: number
  shipping?: number
  coupon?: string
  items: GA4EcommerceItem[]
}

const DEFAULT_CURRENCY = 'USD'
const DEFAULT_BRAND = 'M&G Jewelry'
const PURCHASE_DEDUP_PREFIX = 'mg_ga4_purchase_'

function canSendAnalyticsEvent(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.gtag !== 'function') return false
  if (isExcludedAnalyticsPath(window.location?.pathname)) return false
  return true
}

function normalizeItems(items: GA4EcommerceItem[], currency: string): GA4EcommerceItem[] {
  return items.map((item) => ({
    ...item,
    item_brand: item.item_brand || DEFAULT_BRAND,
    currency: item.currency || currency,
    price: Number(item.price),
    quantity: item.quantity ?? 1,
  }))
}

/**
 * Generic safe GA4 event dispatcher.
 * Silently no-ops on SSR, when gtag is unavailable, or on excluded `/admin` paths.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): boolean {
  if (!eventName || !canSendAnalyticsEvent()) {
    return false
  }
  window.gtag!('event', eventName, params ?? {})
  return true
}

/**
 * Ready-to-use GA4 `view_item` ecommerce helper.
 * Call when a visitor views a product detail page.
 */
export function trackViewItem(params: GA4ViewItemParams): boolean {
  const currency = params.currency || DEFAULT_CURRENCY
  return trackEvent('view_item', {
    currency,
    value: Number(params.value),
    items: normalizeItems(params.items, currency),
  })
}

/**
 * Ready-to-use GA4 `add_to_cart` ecommerce helper.
 * Call when a visitor adds a jewelry piece to their cart.
 */
export function trackAddToCart(params: GA4AddToCartParams): boolean {
  const currency = params.currency || DEFAULT_CURRENCY
  return trackEvent('add_to_cart', {
    currency,
    value: Number(params.value),
    items: normalizeItems(params.items, currency),
  })
}

/**
 * Ready-to-use GA4 `remove_from_cart` ecommerce helper.
 */
export function trackRemoveFromCart(params: GA4RemoveFromCartParams): boolean {
  const currency = params.currency || DEFAULT_CURRENCY
  return trackEvent('remove_from_cart', {
    currency,
    value: Number(params.value),
    items: normalizeItems(params.items, currency),
  })
}

/**
 * Ready-to-use GA4 `view_cart` ecommerce helper.
 */
export function trackViewCart(params: GA4ViewCartParams): boolean {
  const currency = params.currency || DEFAULT_CURRENCY
  return trackEvent('view_cart', {
    currency,
    value: Number(params.value),
    items: normalizeItems(params.items, currency),
  })
}

/**
 * Ready-to-use GA4 `begin_checkout` ecommerce helper.
 * Call when a visitor initiates Stripe checkout.
 */
export function trackBeginCheckout(params: GA4BeginCheckoutParams): boolean {
  const currency = params.currency || DEFAULT_CURRENCY
  return trackEvent('begin_checkout', {
    currency,
    value: Number(params.value),
    ...(params.coupon ? { coupon: params.coupon } : {}),
    items: normalizeItems(params.items, currency),
  })
}

/**
 * Ready-to-use GA4 `purchase` ecommerce helper.
 *
 * Safeguards:
 * 1. Requires `verifiedPayment === true` and a non-empty `transaction_id` so
 *    purchase events are NEVER invented or fired without a verified transaction.
 * 2. Deduplicates by `transaction_id` in `sessionStorage` so refreshing the
 *    order confirmation page cannot double-count revenue.
 */
export function trackPurchase(params: GA4PurchaseParams): boolean {
  if (params.verifiedPayment !== true) {
    return false
  }
  const transactionId = params.transaction_id?.trim()
  if (!transactionId || !params.items || params.items.length === 0) {
    return false
  }
  if (!canSendAnalyticsEvent()) {
    return false
  }

  const dedupKey = `${PURCHASE_DEDUP_PREFIX}${transactionId}`
  try {
    if (window.sessionStorage.getItem(dedupKey) === '1') {
      return false
    }
  } catch {
    // Continue if sessionStorage is unavailable
  }

  const currency = params.currency || DEFAULT_CURRENCY
  const sent = trackEvent('purchase', {
    transaction_id: transactionId,
    currency,
    value: Number(params.value),
    ...(typeof params.tax === 'number' ? { tax: Number(params.tax) } : {}),
    ...(typeof params.shipping === 'number' ? { shipping: Number(params.shipping) } : {}),
    ...(params.coupon ? { coupon: params.coupon } : {}),
    items: normalizeItems(params.items, currency),
  })

  if (sent) {
    try {
      window.sessionStorage.setItem(dedupKey, '1')
    } catch {
      // Ignore storage errors
    }
  }

  return sent
}

/**
 * Ensures GA4 config runs once if a visitor enters the public storefront
 * via client-side navigation from an excluded `/admin` route.
 * On normal public page loads, `window.__mgGa4Configured` is already `true`
 * from the root `<head>` tag, so this is a guaranteed no-op (no duplicate page_view).
 */
export function ensureGaConfiguredOnPublicEntry(
  measurementId: string = GA_MEASUREMENT_ID
): boolean {
  if (typeof window === 'undefined') return false
  if (window.__mgGa4Configured) return false
  if (isExcludedAnalyticsPath(window.location?.pathname)) return false
  if (typeof window.gtag !== 'function') return false

  window.__mgGa4Configured = true
  window.gtag('js', new Date())
  window.gtag('config', measurementId)
  return true
}
