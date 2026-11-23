import {
  type AdminStockDisplay,
  type ProductVariantRecord,
  type StockMode,
  computeAggregateProductStateFromVariants,
  formatCategoryLabel,
  getAdminStockDisplay,
  getStockMode,
  isUnlimitedStock,
  normalizeCategory,
  parseImagesList,
  resolveRealProductSku,
} from "@/lib/inventory"
import { createAdminProductService } from "@/lib/admin-products"

export const BEST_SELLERS_SETTINGS_ID = "best_sellers_config"
export const HOMEPAGE_BEST_SELLERS_LIMIT = 4

export type BestSellersDisplayMode = "manual" | "automatic" | "hybrid"
export type ProductShowcaseBadge = "best_seller" | "mg_pick" | "none"
export type SelectionType = "manual" | "automatic" | "both" | "none"
export type ShowcaseHeadingType =
  | "best_sellers"
  | "mg_picks"
  | "hybrid"
  | "featured_fallback"

export interface BestSellersConfig {
  mode: BestSellersDisplayMode
  manualProductIds: string[]
  hasExplicitConfig: boolean
  updatedAt: string | null
}

export interface SaveBestSellersConfigInput {
  mode: BestSellersDisplayMode
  manualProductIds: string[]
}

export interface ProductSalesMetrics {
  productId: string
  verifiedNetUnits: number
  verifiedNetRevenue: number
  grossSoldUnits: number
  grossSoldRevenue: number
  refundedUnits: number
  unattributedPartialRefundUnits: number
  unattributedPartialRefundOrders: number
  qualifyingOrderCount: number
  hasUnattributedPartialRefunds: boolean
}

export interface StorefrontBestSellerProduct {
  id: string
  name: string
  nameEs: string
  slug: string
  price: number
  comparePrice: number | null
  images: string
  category: string
  metalType: string
  karat: string
  stoneType: string
  isBestSeller: boolean
  isFeatured: boolean
  inventoryQty: number
  sizes: string | null
  hasVariants: boolean
  showcaseBadge: ProductShowcaseBadge
  selectionType: SelectionType
  verifiedNetUnits: number
  verifiedNetRevenue: number
  createdAt: string
}

export interface AdminBestSellerPerformanceRow {
  id: string
  name: string
  nameEs: string
  slug: string
  sku: string
  variantSkus: string[]
  category: string
  categoryLabel: string
  price: number
  priceMax: number | null
  comparePrice: number | null
  image: string
  isActive: boolean
  isFeatured: boolean
  isBestSeller: boolean
  stock: number
  stockMode: StockMode
  isUnlimited: boolean
  stockDisplay: AdminStockDisplay
  hasVariants: boolean
  variantCount: number
  manualPosition: number | null
  isManualPick: boolean
  isAutomaticBestSeller: boolean
  selectionType: SelectionType
  showcaseBadge: ProductShowcaseBadge
  verifiedNetUnits: number
  verifiedNetRevenue: number
  grossSoldUnits: number
  refundedUnits: number
  unattributedPartialRefundUnits: number
  unattributedPartialRefundOrders: number
  hasUnattributedPartialRefunds: boolean
  qualifyingOrderCount: number
  createdAt: string
}

export interface BestSellersSelectionResult {
  mode: BestSellersDisplayMode
  headingType: ShowcaseHeadingType
  usedFallback: boolean
  hasVerifiedSales: boolean
  hasManualPicks: boolean
  allProducts: StorefrontBestSellerProduct[]
  homepageProducts: StorefrontBestSellerProduct[]
  badgeByProductId: Record<string, ProductShowcaseBadge>
  manualProductIds: string[]
}

export interface AdminBestSellersDashboardData {
  config: BestSellersConfig
  products: AdminBestSellerPerformanceRow[]
  storefrontPreview: {
    mode: BestSellersDisplayMode
    headingType: ShowcaseHeadingType
    usedFallback: boolean
    homepageProductIds: string[]
    viewAllCount: number
  }
  salesSummary: {
    qualifyingOrdersCount: number
    excludedOrdersCount: number
    unattributedPartialRefundOrdersCount: number
    totalVerifiedUnits: number
    totalVerifiedRevenue: number
  }
}

const VALID_DISPLAY_MODES = new Set<BestSellersDisplayMode>([
  "manual",
  "automatic",
  "hybrid",
])

const EXCLUDED_ORDER_STATUSES = new Set([
  "cancelled",
  "canceled",
  "failed",
  "refunded",
  "void",
  "expired",
])

const EXCLUDED_PAYMENT_STATUSES = new Set([
  "failed",
  "refunded",
  "cancelled",
  "canceled",
  "void",
  "expired",
])

const UNPAID_ORDER_STATUSES = new Set([
  "pending",
  "pending_concierge",
  "unpaid",
  "draft",
])

function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

function parseJsonSafe(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, any>
  if (typeof raw !== "string") return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function parseNonNegativeInt(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === "") return null
  const num = Number(value)
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) return null
  return num
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === "") return null
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

export function isValidDisplayMode(raw: unknown): raw is BestSellersDisplayMode {
  return typeof raw === "string" && VALID_DISPLAY_MODES.has(raw as BestSellersDisplayMode)
}

export function normalizeDisplayMode(raw?: unknown): BestSellersDisplayMode {
  const clean = String(raw || "").trim().toLowerCase()
  if (isValidDisplayMode(clean)) {
    return clean
  }
  return "hybrid"
}

export function deduplicateProductIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const rawId of ids) {
    const clean = typeof rawId === "string" ? rawId.trim() : ""
    if (clean && !seen.has(clean)) {
      seen.add(clean)
      out.push(clean)
    }
  }
  return out
}

export function parseBestSellersConfig(rawJson?: string | null): BestSellersConfig {
  if (!rawJson) {
    return {
      mode: "hybrid",
      manualProductIds: [],
      hasExplicitConfig: false,
      updatedAt: null,
    }
  }
  try {
    const parsed = JSON.parse(rawJson)
    if (!parsed || typeof parsed !== "object") {
      return {
        mode: "hybrid",
        manualProductIds: [],
        hasExplicitConfig: false,
        updatedAt: null,
      }
    }
    return {
      mode: normalizeDisplayMode(parsed.mode),
      manualProductIds: deduplicateProductIds(parsed.manualProductIds),
      hasExplicitConfig: true,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    }
  } catch {
    return {
      mode: "hybrid",
      manualProductIds: [],
      hasExplicitConfig: false,
      updatedAt: null,
    }
  }
}

export function serializeBestSellersConfig(input: {
  mode: BestSellersDisplayMode
  manualProductIds: string[]
  updatedAt?: string
}): string {
  return JSON.stringify({
    mode: normalizeDisplayMode(input.mode),
    manualProductIds: deduplicateProductIds(input.manualProductIds),
    updatedAt: input.updatedAt || new Date().toISOString(),
  })
}

/**
 * Identifies test orders so they never pollute verified Best Sellers sales rankings.
 */
export function isTestOrder(order: any): boolean {
  if (!order || typeof order !== "object") return true

  const stripeSessionId = String(order.stripeSessionId || "").trim().toLowerCase()
  if (stripeSessionId.startsWith("cs_test_") || stripeSessionId.startsWith("test_")) {
    return true
  }

  const stripePaymentIntentId = String(order.stripePaymentIntentId || "").trim().toLowerCase()
  if (stripePaymentIntentId.startsWith("pi_test_") || stripePaymentIntentId.startsWith("test_")) {
    return true
  }

  const orderNumber = String(order.orderNumber || "").trim()
  if (/^(test|mg-test)([-_\s]|$)/i.test(orderNumber)) {
    return true
  }

  const email = String(order.email || "").trim().toLowerCase()
  if (
    email === "test@mngjewelry.com" ||
    /@(example\.(com|org|net)|test\.com|mng-test\.local)$/i.test(email) ||
    /\.test$/i.test(email)
  ) {
    return true
  }

  const notes = String(order.notes || "").trim()
  if (
    /(\[test\]|#test\b|\btest\s+order\b|\borden\s+de\s+prueba\b|\bpedido\s+de\s+prueba\b|\btest\s+checkout\b)/i.test(
      notes
    )
  ) {
    return true
  }

  const transactions = Array.isArray(order.transactions) ? order.transactions : []
  for (const tx of transactions) {
    const provider = String(tx?.provider || "").trim().toLowerCase()
    if (provider === "test" || provider === "stripe_test") {
      return true
    }
    const providerId = String(tx?.providerId || "").trim().toLowerCase()
    if (
      providerId.startsWith("cs_test_") ||
      providerId.startsWith("pi_test_") ||
      providerId.startsWith("test_")
    ) {
      return true
    }
    const meta = parseJsonSafe(tx?.metadata)
    if (meta.isTest === true || meta.test === true || meta.testMode === true) {
      return true
    }
  }

  return false
}

export interface OrderSalesClassification {
  kind: "excluded" | "paid_clean" | "partially_refunded"
  reason: string
  refundedCents: number
  totalCents: number
}

/**
 * Classifies an order according to real M&G Jewelry payment, status, and refund semantics.
 * Never counts unpaid, pending, failed, canceled, test, or fully refunded orders.
 */
export function classifyOrderForSales(order: any): OrderSalesClassification {
  const totalCents = Math.max(0, Math.round(Number(order?.total || 0) * 100))
  const refundedCents = Math.max(0, Math.round(Number(order?.refundedAmount || 0)))

  if (!order || isTestOrder(order)) {
    return { kind: "excluded", reason: "test_order", refundedCents, totalCents }
  }

  const orderStatus = String(order.status || "").trim().toLowerCase()
  const paymentStatus = String(order.paymentStatus || "").trim().toLowerCase()
  const reservationStatus = String(order.reservationStatus || "").trim().toLowerCase()
  const transactions = Array.isArray(order.transactions) ? order.transactions : []

  if (EXCLUDED_ORDER_STATUSES.has(orderStatus)) {
    return { kind: "excluded", reason: `order_status_${orderStatus}`, refundedCents, totalCents }
  }

  if (EXCLUDED_PAYMENT_STATUSES.has(paymentStatus)) {
    return {
      kind: "excluded",
      reason: `payment_status_${paymentStatus}`,
      refundedCents,
      totalCents,
    }
  }

  if (reservationStatus === "released" || reservationStatus === "restocked") {
    return {
      kind: "excluded",
      reason: `reservation_${reservationStatus}`,
      refundedCents,
      totalCents,
    }
  }

  // Full financial refund always excludes the order from completed sales
  if (totalCents > 0 && refundedCents >= totalCents) {
    return { kind: "excluded", reason: "fully_refunded_amount", refundedCents, totalCents }
  }

  const hasRefundedTx = transactions.some(
    (t: any) => String(t?.status || "").trim().toLowerCase() === "refunded"
  )
  if (hasRefundedTx) {
    return { kind: "excluded", reason: "refunded_transaction", refundedCents, totalCents }
  }

  const hasSucceededTx = transactions.some(
    (t: any) => String(t?.status || "").trim().toLowerCase() === "succeeded"
  )
  const hasFailedTx = transactions.some(
    (t: any) => String(t?.status || "").trim().toLowerCase() === "failed"
  )
  const hasPartialRefundTx = transactions.some(
    (t: any) => String(t?.status || "").trim().toLowerCase() === "partially_refunded"
  )

  const isStripeOrder = Boolean(order.stripeSessionId)
  const isConfirmedPaid = isStripeOrder
    ? paymentStatus === "paid" || paymentStatus === "partially_refunded"
    : paymentStatus === "paid" ||
      paymentStatus === "partially_refunded" ||
      (paymentStatus === "pending" &&
        hasSucceededTx &&
        !hasFailedTx &&
        !UNPAID_ORDER_STATUSES.has(orderStatus))

  if (!isConfirmedPaid) {
    return { kind: "excluded", reason: "unpaid_or_unconfirmed", refundedCents, totalCents }
  }

  // Check if the order or any of its items carries a partial refund / return
  const items = Array.isArray(order.items) ? order.items : []
  const hasItemLevelRefund = items.some((item: any) => {
    const opts = parseJsonSafe(item?.options)
    const rq = parseNonNegativeInt(opts.refundedQuantity ?? opts.returnedQuantity)
    const ra = parseNonNegativeNumber(opts.refundedAmount)
    const rc = parseNonNegativeInt(opts.refundedCents)
    return (rq !== null && rq > 0) || (ra !== null && ra > 0) || (rc !== null && rc > 0)
  })

  if (
    paymentStatus === "partially_refunded" ||
    refundedCents > 0 ||
    hasPartialRefundTx ||
    hasItemLevelRefund
  ) {
    return {
      kind: "partially_refunded",
      reason: "partially_refunded",
      refundedCents,
      totalCents,
    }
  }

  return { kind: "paid_clean", reason: "paid", refundedCents: 0, totalCents }
}

function getOrCreateMetrics(
  map: Map<string, ProductSalesMetrics>,
  productId: string
): ProductSalesMetrics {
  let entry = map.get(productId)
  if (!entry) {
    entry = {
      productId,
      verifiedNetUnits: 0,
      verifiedNetRevenue: 0,
      grossSoldUnits: 0,
      grossSoldRevenue: 0,
      refundedUnits: 0,
      unattributedPartialRefundUnits: 0,
      unattributedPartialRefundOrders: 0,
      qualifyingOrderCount: 0,
      hasUnattributedPartialRefunds: false,
    }
    map.set(productId, entry)
  }
  return entry
}

export interface SalesCalculationOutput {
  metricsByProductId: Map<string, ProductSalesMetrics>
  qualifyingOrdersCount: number
  excludedOrdersCount: number
  unattributedPartialRefundOrdersCount: number
}

/**
 * Calculates real product-level sales metrics from database orders.
 * - Counts only confirmed paid orders (excludes pending, unpaid, failed, canceled, test, and fully refunded).
 * - Accounts for item-level partial refunds/returns when reliable item-level refund data is present.
 * - Refuses to fabricate product-level net sales when an order-level partial refund cannot be
 *   reliably attributed to specific products; tracks those separately under grossSoldUnits and
 *   unattributedPartialRefundUnits.
 */
export function calculateProductSalesMetrics(orders: any[]): SalesCalculationOutput {
  const metricsByProductId = new Map<string, ProductSalesMetrics>()
  const qualifyingOrderIdsByProduct = new Map<string, Set<string>>()
  const unattributedOrderIdsByProduct = new Map<string, Set<string>>()

  let qualifyingOrdersCount = 0
  let excludedOrdersCount = 0
  let unattributedPartialRefundOrdersCount = 0

  for (const order of orders || []) {
    const classification = classifyOrderForSales(order)
    if (classification.kind === "excluded") {
      excludedOrdersCount += 1
      continue
    }

    const rawItems = Array.isArray(order.items) ? order.items : []
    const validItems = rawItems
      .map((item: any) => {
        const qty = Math.max(0, Math.trunc(Number(item?.quantity || 0)))
        const unitPrice = Math.max(0, Number(item?.price || 0))
        const lineSubtotal = roundCurrency(unitPrice * qty)
        return {
          raw: item,
          productId: typeof item?.productId === "string" ? item.productId.trim() : "",
          quantity: qty,
          unitPrice,
          lineSubtotal,
          options: parseJsonSafe(item?.options),
        }
      })
      .filter((it: any) => it.quantity > 0)

    if (validItems.length === 0) {
      continue
    }

    // Proportionally apply order-level discount across item subtotals to get true product revenue
    const sumLineSubtotals = validItems.reduce((sum: number, it: any) => sum + it.lineSubtotal, 0)
    const effectiveSubtotal = sumLineSubtotals > 0 ? sumLineSubtotals : Math.max(0, Number(order.subtotal || 0))
    const orderDiscount = Math.max(0, Math.min(Number(order.discount || 0), effectiveSubtotal))
    const discountMultiplier =
      effectiveSubtotal > 0 ? Math.max(0, (effectiveSubtotal - orderDiscount) / effectiveSubtotal) : 1

    const enrichedItems = validItems.map((it: any) => ({
      ...it,
      itemGrossRevenue: roundCurrency(it.lineSubtotal * discountMultiplier),
    }))

    const orderKey = String(order.id || order.orderNumber || Math.random())

    if (classification.kind === "paid_clean") {
      qualifyingOrdersCount += 1
      for (const item of enrichedItems) {
        if (!item.productId) continue
        const metrics = getOrCreateMetrics(metricsByProductId, item.productId)
        metrics.verifiedNetUnits += item.quantity
        metrics.verifiedNetRevenue = roundCurrency(metrics.verifiedNetRevenue + item.itemGrossRevenue)
        metrics.grossSoldUnits += item.quantity
        metrics.grossSoldRevenue = roundCurrency(metrics.grossSoldRevenue + item.itemGrossRevenue)

        let orderSet = qualifyingOrderIdsByProduct.get(item.productId)
        if (!orderSet) {
          orderSet = new Set()
          qualifyingOrderIdsByProduct.set(item.productId, orderSet)
        }
        orderSet.add(orderKey)
      }
      continue
    }

    // Partially refunded order: determine whether reliable item-level refund attribution exists
    const itemRefundSpecs = enrichedItems.map((item: any) => {
      const explicitQty = parseNonNegativeInt(
        item.options.refundedQuantity ?? item.options.returnedQuantity
      )
      const explicitAmountDollars = parseNonNegativeNumber(item.options.refundedAmount)
      const explicitAmountCents = parseNonNegativeInt(item.options.refundedCents)
      const explicitDollars =
        explicitAmountDollars !== null
          ? explicitAmountDollars
          : explicitAmountCents !== null
          ? roundCurrency(explicitAmountCents / 100)
          : null

      const hasExplicit = explicitQty !== null || explicitDollars !== null
      return {
        item,
        explicitQty,
        explicitDollars,
        hasExplicit,
      }
    })

    const hasAnyExplicitAttribution = itemRefundSpecs.some((s: any) => s.hasExplicit)
    const totalItemsGrossRevenue = roundCurrency(
      enrichedItems.reduce((sum: number, it: any) => sum + it.itemGrossRevenue, 0)
    )
    const refundedDollars = roundCurrency(classification.refundedCents / 100)
    const distinctProductIds = new Set(
      enrichedItems.map((it: any) => it.productId).filter(Boolean)
    )

    if (hasAnyExplicitAttribution) {
      let totalExplicitRefundCents = 0
      const resolvedItems = itemRefundSpecs.map((spec: any) => {
        const qty = spec.item.quantity
        const perUnitNetPrice = qty > 0 ? spec.item.itemGrossRevenue / qty : 0
        const refundedQty = Math.min(qty, spec.explicitQty ?? 0)
        const refundedRev =
          spec.explicitDollars !== null
            ? Math.min(spec.item.itemGrossRevenue, roundCurrency(spec.explicitDollars))
            : roundCurrency(refundedQty * perUnitNetPrice)

        totalExplicitRefundCents += Math.round(refundedRev * 100)
        return {
          ...spec.item,
          refundedQty,
          netQty: Math.max(0, qty - refundedQty),
          netRev: roundCurrency(Math.max(0, spec.item.itemGrossRevenue - refundedRev)),
        }
      })

      // Ensure order-level refundedAmount (minus shipping/tax tolerance) is actually explained
      // by the item-level refund records so we never silently ignore an unattributed refund portion.
      const shippingAndTaxCents = Math.round(
        (Math.max(0, Number(order.shipping || 0)) + Math.max(0, Number(order.tax || 0))) * 100
      )
      const unexplainedRefundCents = Math.max(
        0,
        classification.refundedCents - totalExplicitRefundCents - shippingAndTaxCents
      )

      if (unexplainedRefundCents <= 1) {
        let orderContributedNetUnits = false
        for (const item of resolvedItems) {
          if (!item.productId) continue
          const metrics = getOrCreateMetrics(metricsByProductId, item.productId)
          metrics.grossSoldUnits += item.quantity
          metrics.grossSoldRevenue = roundCurrency(metrics.grossSoldRevenue + item.itemGrossRevenue)
          metrics.refundedUnits += item.refundedQty
          metrics.verifiedNetUnits += item.netQty
          metrics.verifiedNetRevenue = roundCurrency(metrics.verifiedNetRevenue + item.netRev)

          if (item.netQty > 0) {
            orderContributedNetUnits = true
            let orderSet = qualifyingOrderIdsByProduct.get(item.productId)
            if (!orderSet) {
              orderSet = new Set()
              qualifyingOrderIdsByProduct.set(item.productId, orderSet)
            }
            orderSet.add(orderKey)
          }
        }
        if (orderContributedNetUnits) {
          qualifyingOrdersCount += 1
        }
        continue
      }
    }

    // Single-product order where the refunded amount covers 100% of the product value
    // (for example, item fully refunded while shipping fee was retained): 0 net units, $0 net revenue.
    if (
      distinctProductIds.size === 1 &&
      totalItemsGrossRevenue > 0 &&
      refundedDollars >= totalItemsGrossRevenue - 0.01
    ) {
      for (const item of enrichedItems) {
        if (!item.productId) continue
        const metrics = getOrCreateMetrics(metricsByProductId, item.productId)
        metrics.grossSoldUnits += item.quantity
        metrics.grossSoldRevenue = roundCurrency(metrics.grossSoldRevenue + item.itemGrossRevenue)
        metrics.refundedUnits += item.quantity
      }
      continue
    }

    // Order-level partial refund cannot be reliably attributed to specific products/quantities.
    // Do NOT fabricate net units or net revenue; track separately as gross / unattributed.
    unattributedPartialRefundOrdersCount += 1
    for (const item of enrichedItems) {
      if (!item.productId) continue
      const metrics = getOrCreateMetrics(metricsByProductId, item.productId)
      metrics.grossSoldUnits += item.quantity
      metrics.grossSoldRevenue = roundCurrency(metrics.grossSoldRevenue + item.itemGrossRevenue)
      metrics.unattributedPartialRefundUnits += item.quantity
      metrics.hasUnattributedPartialRefunds = true

      let unattrSet = unattributedOrderIdsByProduct.get(item.productId)
      if (!unattrSet) {
        unattrSet = new Set()
        unattributedOrderIdsByProduct.set(item.productId, unattrSet)
      }
      unattrSet.add(orderKey)
    }
  }

  for (const [productId, metrics] of metricsByProductId.entries()) {
    metrics.qualifyingOrderCount = qualifyingOrderIdsByProduct.get(productId)?.size || 0
    metrics.unattributedPartialRefundOrders =
      unattributedOrderIdsByProduct.get(productId)?.size || 0
  }

  return {
    metricsByProductId,
    qualifyingOrdersCount,
    excludedOrdersCount,
    unattributedPartialRefundOrdersCount,
  }
}

export function computeShowcaseBadge(params: {
  isManualPick: boolean
  isAutomaticBestSeller: boolean
}): ProductShowcaseBadge {
  // If a product qualifies through real verified sales, show a single "Best Seller" badge
  // (never cluttering with duplicate badges when it is also manually picked).
  if (params.isAutomaticBestSeller) return "best_seller"
  if (params.isManualPick) return "mg_pick"
  return "none"
}

export function computeSelectionType(params: {
  isManualPick: boolean
  isAutomaticBestSeller: boolean
}): SelectionType {
  if (params.isManualPick && params.isAutomaticBestSeller) return "both"
  if (params.isManualPick) return "manual"
  if (params.isAutomaticBestSeller) return "automatic"
  return "none"
}

export interface NormalizedCatalogProduct {
  id: string
  name: string
  nameEs: string
  slug: string
  sku: string
  variantSkus: string[]
  category: string
  categoryLabel: string
  price: number
  priceMax: number | null
  comparePrice: number | null
  images: string
  image: string
  metalType: string
  karat: string
  stoneType: string
  isActive: boolean
  isFeatured: boolean
  isBestSeller: boolean
  inventoryQty: number
  sizes: string | null
  hasVariants: boolean
  variantCount: number
  stockDisplay: AdminStockDisplay
  createdAt: Date
}

/**
 * Single shared selection resolver used by Homepage, /collections/best-sellers, and Admin preview.
 */
export function resolveBestSellersSelection(params: {
  config: BestSellersConfig
  catalogProducts: NormalizedCatalogProduct[]
  metricsByProductId: Map<string, ProductSalesMetrics>
}): BestSellersSelectionResult {
  const { config, catalogProducts, metricsByProductId } = params
  const mode = normalizeDisplayMode(config.mode)

  // Only active, non-deleted products can ever appear on the storefront
  const activeProducts = catalogProducts.filter(
    (p) => p.isActive && !p.slug.startsWith("deleted-")
  )
  const activeMap = new Map(activeProducts.map((p) => [p.id, p]))

  // Resolve effective manual picks (ordered, active only)
  const effectiveManualIds = config.hasExplicitConfig
    ? deduplicateProductIds(config.manualProductIds)
    : (() => {
        const featured = activeProducts.filter((p) => p.isFeatured).map((p) => p.id)
        if (featured.length > 0) return featured
        // Preserve any pre-existing legacy isBestSeller manual tags before first Admin save
        return activeProducts.filter((p) => p.isBestSeller).map((p) => p.id)
      })()

  const activeManualIds = effectiveManualIds.filter((id) => activeMap.has(id))
  const manualSet = new Set(activeManualIds)

  // Determine automatic best sellers strictly from verified net sales (> 0 units sold)
  const automaticRanked = activeProducts
    .filter((p) => (metricsByProductId.get(p.id)?.verifiedNetUnits || 0) > 0)
    .sort((a, b) => {
      const mA = metricsByProductId.get(a.id)
      const mB = metricsByProductId.get(b.id)
      const unitsDiff = (mB?.verifiedNetUnits || 0) - (mA?.verifiedNetUnits || 0)
      if (unitsDiff !== 0) return unitsDiff
      const revDiff = (mB?.verifiedNetRevenue || 0) - (mA?.verifiedNetRevenue || 0)
      if (revDiff !== 0) return revDiff
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime()
      if (timeDiff !== 0) return timeDiff
      return a.id.localeCompare(b.id)
    })

  const automaticSet = new Set(automaticRanked.map((p) => p.id))

  // Compute badge map across ALL active catalog products so badges are consistent site-wide
  const badgeByProductId: Record<string, ProductShowcaseBadge> = {}
  for (const p of activeProducts) {
    badgeByProductId[p.id] = computeShowcaseBadge({
      isManualPick: manualSet.has(p.id),
      isAutomaticBestSeller: automaticSet.has(p.id),
    })
  }

  const toStorefrontItem = (
    p: NormalizedCatalogProduct,
    overrideBadge?: ProductShowcaseBadge
  ): StorefrontBestSellerProduct => {
    const metrics = metricsByProductId.get(p.id)
    const isManualPick = manualSet.has(p.id)
    const isAutomaticBestSeller = automaticSet.has(p.id)
    const badge =
      overrideBadge !== undefined
        ? overrideBadge
        : computeShowcaseBadge({ isManualPick, isAutomaticBestSeller })
    return {
      id: p.id,
      name: p.name,
      nameEs: p.nameEs,
      slug: p.slug,
      price: p.price,
      comparePrice: p.comparePrice,
      images: p.images,
      category: p.category,
      metalType: p.metalType,
      karat: p.karat,
      stoneType: p.stoneType,
      isBestSeller: badge === "best_seller",
      isFeatured: isManualPick,
      inventoryQty: p.inventoryQty,
      sizes: p.sizes,
      hasVariants: p.hasVariants,
      showcaseBadge: badge,
      selectionType: computeSelectionType({ isManualPick, isAutomaticBestSeller }),
      verifiedNetUnits: metrics?.verifiedNetUnits || 0,
      verifiedNetRevenue: metrics?.verifiedNetRevenue || 0,
      createdAt: p.createdAt.toISOString(),
    }
  }

  const manualProducts = activeManualIds
    .map((id) => activeMap.get(id))
    .filter((p): p is NormalizedCatalogProduct => Boolean(p))

  const activeCatalogNewest = [...activeProducts].sort((a, b) => {
    const diff = b.createdAt.getTime() - a.createdAt.getTime()
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id)
  })

  let selectedItems: StorefrontBestSellerProduct[] = []
  let headingType: ShowcaseHeadingType = "best_sellers"
  let usedFallback = false

  if (mode === "manual") {
    selectedItems = manualProducts.map((p) => toStorefrontItem(p))
    headingType = "mg_picks"
    usedFallback = false
  } else if (mode === "automatic") {
    if (automaticRanked.length > 0) {
      selectedItems = automaticRanked.map((p) => toStorefrontItem(p))
      headingType = "best_sellers"
      usedFallback = false
    } else if (manualProducts.length > 0) {
      // No verified sales yet: fall back to M&G Picks without falsely labeling them as Best Sellers
      selectedItems = manualProducts.map((p) => toStorefrontItem(p, "mg_pick"))
      headingType = "mg_picks"
      usedFallback = true
    } else {
      // Preserve recent active-catalog fallback when neither sales nor manual picks exist yet
      selectedItems = activeCatalogNewest.map((p) => toStorefrontItem(p, "none"))
      headingType = "featured_fallback"
      usedFallback = true
    }
  } else {
    // Hybrid mode (default):
    // 1. Manually selected M&G Picks in exact manual display order
    // 2. Remaining verified top-selling products without duplicates
    const seen = new Set<string>()
    const merged: NormalizedCatalogProduct[] = []

    for (const p of manualProducts) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        merged.push(p)
      }
    }
    for (const p of automaticRanked) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        merged.push(p)
      }
    }

    if (merged.length > 0) {
      selectedItems = merged.map((p) => toStorefrontItem(p))
      if (manualProducts.length > 0 && automaticRanked.length > 0) {
        headingType = "hybrid"
      } else if (automaticRanked.length > 0) {
        headingType = "best_sellers"
      } else {
        headingType = "mg_picks"
      }
      usedFallback = false
    } else {
      // Neither manual picks nor verified sales yet: fall back to active catalog with no false badges
      selectedItems = activeCatalogNewest.map((p) => toStorefrontItem(p, "none"))
      headingType = "featured_fallback"
      usedFallback = true
    }
  }

  return {
    mode,
    headingType,
    usedFallback,
    hasVerifiedSales: automaticRanked.length > 0,
    hasManualPicks: manualProducts.length > 0,
    allProducts: selectedItems,
    homepageProducts: selectedItems.slice(0, HOMEPAGE_BEST_SELLERS_LIMIT),
    badgeByProductId,
    manualProductIds: activeManualIds,
  }
}

export function createBestSellersService(db: any) {
  const productService = createAdminProductService(db)

  async function readStoredConfig(): Promise<BestSellersConfig> {
    try {
      if (!db.siteSettings || typeof db.siteSettings.findUnique !== "function") {
        return parseBestSellersConfig(null)
      }
      const row = await db.siteSettings.findUnique({
        where: { id: BEST_SELLERS_SETTINGS_ID },
      })
      return parseBestSellersConfig(row?.shippingInfo)
    } catch {
      return parseBestSellersConfig(null)
    }
  }

  async function loadNormalizedCatalogProducts(): Promise<NormalizedCatalogProduct[]> {
    const [dbProducts, metaStore] = await Promise.all([
      db.product.findMany({
        where: { NOT: { slug: { startsWith: "deleted-" } } },
        orderBy: { createdAt: "desc" },
      }),
      productService.getCatalogMetadata(),
    ])

    // Batch-load all ProductVariant rows once to avoid N+1 queries
    const variantsByProduct = new Map<string, ProductVariantRecord[]>()
    if (db.productVariant && typeof db.productVariant.findMany === "function") {
      try {
        const allDbVars = await db.productVariant.findMany({
          orderBy: { sortOrder: "asc" },
        })
        if (Array.isArray(allDbVars)) {
          for (const row of allDbVars) {
            const list = variantsByProduct.get(row.productId) || []
            list.push({
              id: String(row.id),
              productId: String(row.productId),
              size: String(row.size || "").trim(),
              variantType: (row.variantType || "length") as any,
              price: Number(row.price || 0),
              comparePrice: row.comparePrice ?? null,
              weight: row.weight ?? null,
              sku: String(row.sku || "").trim(),
              inventoryQty: Number(row.inventoryQty ?? 0),
              stockMode: isUnlimitedStock(row.inventoryQty) ? "unlimited" : "limited",
              isUnlimited: isUnlimitedStock(row.inventoryQty),
              isActive: row.isActive !== false,
              sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : list.length,
            })
            variantsByProduct.set(row.productId, list)
          }
        }
      } catch {
        // Fallback to CatalogMetadataStore variants below
      }
    }

    return dbProducts.map((p: any) => {
      const prodMeta = metaStore.products[p.id] || {}
      const threshold = prodMeta.lowStockThreshold ?? metaStore.lowStockThreshold

      const dbVars = variantsByProduct.get(p.id) || []
      const metaVars =
        prodMeta.hasVariants && Array.isArray(prodMeta.variants)
          ? (prodMeta.variants as ProductVariantRecord[])
          : []
      const variants = dbVars.length > 0 ? dbVars : metaVars
      const hasVariants = variants.length > 0

      let effectivePrice = Number(p.price || 0)
      let effectivePriceMax: number | null = null
      let effectiveComparePrice = p.comparePrice ?? null
      let effectiveInventoryQty = Number(p.inventoryQty ?? 0)
      let effectiveSizes: string | null = p.sizes ?? null

      if (hasVariants) {
        const agg = computeAggregateProductStateFromVariants(variants)
        effectivePrice = agg.price
        effectiveComparePrice = agg.comparePrice
        effectiveInventoryQty = agg.inventoryQty
        effectiveSizes = agg.sizes.length > 0 ? JSON.stringify(agg.sizes) : null

        const activeVars = variants.filter((v) => v.isActive)
        const pool = activeVars.length > 0 ? activeVars : variants
        const maxPrice = Math.max(...pool.map((v) => v.price))
        if (Number.isFinite(maxPrice) && maxPrice > effectivePrice) {
          effectivePriceMax = maxPrice
        }
      }

      const imagesList = parseImagesList(p.images)
      const baseSku = resolveRealProductSku(prodMeta.sku, p.slug) || ""
      const variantSkusSet = new Set<string>()
      if (prodMeta.variantSkus && typeof prodMeta.variantSkus === "object") {
        for (const vSku of Object.values(prodMeta.variantSkus)) {
          const clean = resolveRealProductSku(vSku, p.slug)
          if (clean) variantSkusSet.add(clean)
        }
      }
      for (const v of variants) {
        const clean = resolveRealProductSku(v.sku, p.slug)
        if (clean) variantSkusSet.add(clean)
      }

      const createdAt =
        p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt || Date.now())

      return {
        id: p.id,
        name: p.name,
        nameEs: p.nameEs || p.name,
        slug: p.slug,
        sku: baseSku,
        variantSkus: Array.from(variantSkusSet),
        category: normalizeCategory(p.category),
        categoryLabel: formatCategoryLabel(p.category),
        price: effectivePrice,
        priceMax: effectivePriceMax,
        comparePrice: effectiveComparePrice,
        images: p.images,
        image: imagesList[0] || "/placeholder.svg",
        metalType: prodMeta.metalColor || p.metalType || "Yellow Gold",
        karat: prodMeta.material || p.karat || "",
        stoneType: p.stoneType || "none",
        isActive: Boolean(p.isActive),
        isFeatured: Boolean(p.isFeatured),
        isBestSeller: Boolean(p.isBestSeller),
        inventoryQty: effectiveInventoryQty,
        sizes: effectiveSizes,
        hasVariants,
        variantCount: variants.length,
        stockDisplay: getAdminStockDisplay(effectiveInventoryQty, threshold),
        createdAt,
      }
    })
  }

  async function loadSalesMetrics(): Promise<SalesCalculationOutput> {
    if (!db.order || typeof db.order.findMany !== "function") {
      return {
        metricsByProductId: new Map(),
        qualifyingOrdersCount: 0,
        excludedOrdersCount: 0,
        unattributedPartialRefundOrdersCount: 0,
      }
    }

    const orders = await db.order.findMany({
      include: {
        items: true,
        transactions: true,
      },
    })

    return calculateProductSalesMetrics(orders)
  }

  /**
   * Shared storefront source of truth used by Homepage, /collections/best-sellers,
   * and badge computation across all storefront pages.
   */
  async function getStorefrontSelection(): Promise<BestSellersSelectionResult> {
    const [config, catalogProducts, sales] = await Promise.all([
      readStoredConfig(),
      loadNormalizedCatalogProducts(),
      loadSalesMetrics(),
    ])

    return resolveBestSellersSelection({
      config,
      catalogProducts,
      metricsByProductId: sales.metricsByProductId,
    })
  }

  /**
   * Returns a lightweight productId -> badge map for category collections, search, and product detail pages.
   */
  async function getProductBadgesMap(): Promise<Record<string, ProductShowcaseBadge>> {
    const selection = await getStorefrontSelection()
    return selection.badgeByProductId
  }

  /**
   * Loads full data for the Admin "Best Sellers & Featured Picks" management page.
   */
  async function getAdminDashboardData(): Promise<AdminBestSellersDashboardData> {
    const [storedConfig, catalogProducts, sales] = await Promise.all([
      readStoredConfig(),
      loadNormalizedCatalogProducts(),
      loadSalesMetrics(),
    ])

    const selection = resolveBestSellersSelection({
      config: storedConfig,
      catalogProducts,
      metricsByProductId: sales.metricsByProductId,
    })

    // Resolve effective manual list (preserving order, including inactive items if previously picked
    // so admin can see and remove them if desired)
    const effectiveManualIds = storedConfig.hasExplicitConfig
      ? storedConfig.manualProductIds.filter((id) =>
          catalogProducts.some((p) => p.id === id)
        )
      : selection.manualProductIds

    const manualIndexMap = new Map<string, number>()
    effectiveManualIds.forEach((id, idx) => {
      manualIndexMap.set(id, idx + 1)
    })

    let totalVerifiedUnits = 0
    let totalVerifiedRevenue = 0

    const rows: AdminBestSellerPerformanceRow[] = catalogProducts.map((p) => {
      const metrics = sales.metricsByProductId.get(p.id)
      const verifiedNetUnits = metrics?.verifiedNetUnits || 0
      const verifiedNetRevenue = metrics?.verifiedNetRevenue || 0
      totalVerifiedUnits += verifiedNetUnits
      totalVerifiedRevenue = roundCurrency(totalVerifiedRevenue + verifiedNetRevenue)

      const manualPosition = manualIndexMap.get(p.id) ?? null
      const isManualPick = manualPosition !== null
      const isAutomaticBestSeller = p.isActive && verifiedNetUnits > 0

      return {
        id: p.id,
        name: p.name,
        nameEs: p.nameEs,
        slug: p.slug,
        sku: p.sku,
        variantSkus: p.variantSkus,
        category: p.category,
        categoryLabel: p.categoryLabel,
        price: p.price,
        priceMax: p.priceMax,
        comparePrice: p.comparePrice,
        image: p.image,
        isActive: p.isActive,
        isFeatured: isManualPick,
        isBestSeller: isAutomaticBestSeller,
        stock: p.inventoryQty,
        stockMode: getStockMode(p.inventoryQty),
        isUnlimited: isUnlimitedStock(p.inventoryQty),
        stockDisplay: p.stockDisplay,
        hasVariants: p.hasVariants,
        variantCount: p.variantCount,
        manualPosition,
        isManualPick,
        isAutomaticBestSeller,
        selectionType: computeSelectionType({ isManualPick, isAutomaticBestSeller }),
        showcaseBadge: computeShowcaseBadge({ isManualPick, isAutomaticBestSeller }),
        verifiedNetUnits,
        verifiedNetRevenue,
        grossSoldUnits: metrics?.grossSoldUnits || 0,
        refundedUnits: metrics?.refundedUnits || 0,
        unattributedPartialRefundUnits: metrics?.unattributedPartialRefundUnits || 0,
        unattributedPartialRefundOrders: metrics?.unattributedPartialRefundOrders || 0,
        hasUnattributedPartialRefunds: Boolean(metrics?.hasUnattributedPartialRefunds),
        qualifyingOrderCount: metrics?.qualifyingOrderCount || 0,
        createdAt: p.createdAt.toISOString(),
      }
    })

    return {
      config: {
        mode: selection.mode,
        manualProductIds: effectiveManualIds,
        hasExplicitConfig: storedConfig.hasExplicitConfig,
        updatedAt: storedConfig.updatedAt,
      },
      products: rows,
      storefrontPreview: {
        mode: selection.mode,
        headingType: selection.headingType,
        usedFallback: selection.usedFallback,
        homepageProductIds: selection.homepageProducts.map((p) => p.id),
        viewAllCount: selection.allProducts.length,
      },
      salesSummary: {
        qualifyingOrdersCount: sales.qualifyingOrdersCount,
        excludedOrdersCount: sales.excludedOrdersCount,
        unattributedPartialRefundOrdersCount: sales.unattributedPartialRefundOrdersCount,
        totalVerifiedUnits,
        totalVerifiedRevenue,
      },
    }
  }

  /**
   * Validates and persists display mode + ordered M&G Picks to the existing database,
   * synchronizing existing Product.isFeatured and Product.isBestSeller flags cleanly
   * without deleting any catalog, order, or customer data.
   */
  async function saveConfig(input: SaveBestSellersConfigInput) {
    if (!input || !isValidDisplayMode(input.mode)) {
      throw new Error("Invalid display mode. Must be 'manual', 'automatic', or 'hybrid'.")
    }

    if (!Array.isArray(input.manualProductIds)) {
      throw new Error("manualProductIds must be an array of product IDs.")
    }

    const cleanManualIds = deduplicateProductIds(input.manualProductIds)

    // Verify all submitted product IDs actually exist in the catalog
    const existingProducts = await db.product.findMany({
      where: { NOT: { slug: { startsWith: "deleted-" } } },
      select: { id: true, isActive: true, isFeatured: true, isBestSeller: true },
    })

    const existingIdSet = new Set(existingProducts.map((p: any) => p.id))
    for (const id of cleanManualIds) {
      if (!existingIdSet.has(id)) {
        throw new Error(`Invalid product ID in M&G Picks: ${id}`)
      }
    }

    // Calculate real verified best sellers so Product.isBestSeller stays truthful
    const sales = await loadSalesMetrics()
    const verifiedBestSellerIds = existingProducts
      .filter((p: any) => p.isActive && (sales.metricsByProductId.get(p.id)?.verifiedNetUnits || 0) > 0)
      .map((p: any) => p.id)

    const updatedAt = new Date().toISOString()
    const serialized = serializeBestSellersConfig({
      mode: input.mode,
      manualProductIds: cleanManualIds,
      updatedAt,
    })

    const persistWork = async (tx: any) => {
      await tx.siteSettings.upsert({
        where: { id: BEST_SELLERS_SETTINGS_ID },
        update: { shippingInfo: serialized },
        create: {
          id: BEST_SELLERS_SETTINGS_ID,
          siteName: "M&G Jewelry Best Sellers Config",
          shippingInfo: serialized,
        },
      })

      // Reuse existing Product.isFeatured for M&G Picks
      if (tx.product && typeof tx.product.updateMany === "function") {
        if (cleanManualIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: cleanManualIds } },
            data: { isFeatured: true },
          })
          await tx.product.updateMany({
            where: { id: { notIn: cleanManualIds } },
            data: { isFeatured: false },
          })
        } else {
          await tx.product.updateMany({
            where: {},
            data: { isFeatured: false },
          })
        }

        // Keep Product.isBestSeller truthful to real verified sales (never falsely marking unsold items)
        if (verifiedBestSellerIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: verifiedBestSellerIds } },
            data: { isBestSeller: true },
          })
          await tx.product.updateMany({
            where: { id: { notIn: verifiedBestSellerIds } },
            data: { isBestSeller: false },
          })
        } else {
          await tx.product.updateMany({
            where: {},
            data: { isBestSeller: false },
          })
        }
      }
    }

    if (typeof db.$transaction === "function") {
      await db.$transaction(persistWork)
    } else {
      await persistWork(db)
    }

    return {
      success: true,
      config: {
        mode: input.mode,
        manualProductIds: cleanManualIds,
        hasExplicitConfig: true,
        updatedAt,
      } satisfies BestSellersConfig,
    }
  }

  return {
    readStoredConfig,
    loadNormalizedCatalogProducts,
    loadSalesMetrics,
    getStorefrontSelection,
    getProductBadgesMap,
    getAdminDashboardData,
    saveConfig,
  }
}
