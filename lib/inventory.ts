/**
 * Shared inventory & product metadata domain utilities for M&G Jewelry.
 * Supports Limited Stock (exact non-negative quantities >= 0) and
 * Unlimited Stock (sentinel -1) for on-demand wholesale/custom pieces.
 */

export const UNLIMITED_STOCK_SENTINEL = -1
export const DEFAULT_LOW_STOCK_THRESHOLD = 3
export const CATALOG_METADATA_SETTINGS_ID = "product_catalog_meta"

export type StockMode = "limited" | "unlimited"

export type AdminStockBadgeStatus =
  | "unlimited"
  | "available"
  | "low_stock"
  | "out_of_stock"

export interface AdminStockDisplay {
  label: string
  status: AdminStockBadgeStatus
  isUnlimited: boolean
  isLowStock: boolean
  isOutOfStock: boolean
  quantity: number | null
  threshold: number
}

export interface StorefrontStockState {
  isUnlimited: boolean
  isOutOfStock: boolean
  isLowStock: boolean
  maxPurchasableQty: number | null
  availableQty: number | null
}

export interface ProductExtendedMeta {
  sku?: string
  variantSkus?: Record<string, string>
  material?: string
  metalColor?: string
  lengths?: string[]
  variations?: string[]
  lowStockThreshold?: number
}

export interface VariantSkuSelection {
  size?: string | null
  length?: string | null
  variation?: string | null
}

export interface CatalogMetadataStore {
  lowStockThreshold: number
  products: Record<string, ProductExtendedMeta>
}

/**
 * Returns true when a product is configured for Unlimited Stock (inventoryQty < 0).
 */
export function isUnlimitedStock(inventoryQty: number | null | undefined): boolean {
  return typeof inventoryQty === "number" && Number.isFinite(inventoryQty) && inventoryQty < 0
}

/**
 * Returns the stock mode ("unlimited" or "limited") for a database inventoryQty value.
 */
export function getStockMode(inventoryQty: number | null | undefined): StockMode {
  return isUnlimitedStock(inventoryQty) ? "unlimited" : "limited"
}

/**
 * Validates and converts (mode, quantity) into the database integer representation:
 * - "unlimited" -> -1 (UNLIMITED_STOCK_SENTINEL)
 * - "limited"   -> exact integer >= 0 (throws if negative or non-numeric)
 */
export function normalizeInventoryInput(
  mode: StockMode | string,
  quantity?: number | string | null
): number {
  const cleanMode = String(mode || "limited").toLowerCase().trim()
  if (cleanMode === "unlimited") {
    return UNLIMITED_STOCK_SENTINEL
  }

  if (cleanMode !== "limited") {
    throw new Error("Invalid inventory mode. Must be 'limited' or 'unlimited'.")
  }

  if (quantity === undefined || quantity === null || String(quantity).trim() === "") {
    throw new Error("Please enter a valid stock quantity for Limited Stock mode.")
  }

  const parsed = typeof quantity === "number" ? quantity : Number(String(quantity).trim())
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error("Stock quantity must be a whole number (integer).")
  }

  if (parsed < 0) {
    throw new Error("Stock quantity cannot be negative.")
  }

  return parsed
}

/**
 * Adjusts a limited stock quantity by a delta (+1, -1, +5, etc.), preventing negative values.
 */
export function adjustLimitedStock(currentQty: number, delta: number): number {
  const base = isUnlimitedStock(currentQty) ? 0 : Math.max(0, Math.floor(currentQty || 0))
  return Math.max(0, base + Math.trunc(delta))
}

/**
 * Normalizes a low-stock threshold value (defaults to 3, minimum 1).
 */
export function normalizeLowStockThreshold(threshold?: number | string | null): number {
  if (threshold === undefined || threshold === null || String(threshold).trim() === "") {
    return DEFAULT_LOW_STOCK_THRESHOLD
  }
  const parsed = typeof threshold === "number" ? threshold : Number(String(threshold).trim())
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_LOW_STOCK_THRESHOLD
  }
  return parsed
}

/**
 * Formats the Stock column display for the Admin Dashboard Products table:
 * - "Unlimited" — Unlimited inventory
 * - "10 Available" — Limited inventory with 10 units
 * - "Low Stock (2)" — Limited inventory at or below threshold (default 3)
 * - "Out of Stock" — Zero units available
 */
export function getAdminStockDisplay(
  inventoryQty: number,
  lowStockThreshold: number = DEFAULT_LOW_STOCK_THRESHOLD
): AdminStockDisplay {
  const threshold = normalizeLowStockThreshold(lowStockThreshold)

  if (isUnlimitedStock(inventoryQty)) {
    return {
      label: "Unlimited",
      status: "unlimited",
      isUnlimited: true,
      isLowStock: false,
      isOutOfStock: false,
      quantity: null,
      threshold,
    }
  }

  const safeQty = Math.max(0, Math.floor(inventoryQty || 0))

  if (safeQty === 0) {
    return {
      label: "Out of Stock",
      status: "out_of_stock",
      isUnlimited: false,
      isLowStock: false,
      isOutOfStock: true,
      quantity: 0,
      threshold,
    }
  }

  if (safeQty <= threshold) {
    return {
      label: `Low Stock (${safeQty})`,
      status: "low_stock",
      isUnlimited: false,
      isLowStock: true,
      isOutOfStock: false,
      quantity: safeQty,
      threshold,
    }
  }

  return {
    label: `${safeQty} Available`,
    status: "available",
    isUnlimited: false,
    isLowStock: false,
    isOutOfStock: false,
    quantity: safeQty,
    threshold,
  }
}

/**
 * Computes storefront availability state for ProductCard, ProductDetail, and Cart.
 */
export function getStorefrontStockState(
  inventoryQty: number,
  lowStockThreshold: number = DEFAULT_LOW_STOCK_THRESHOLD
): StorefrontStockState {
  const threshold = normalizeLowStockThreshold(lowStockThreshold)

  if (isUnlimitedStock(inventoryQty)) {
    return {
      isUnlimited: true,
      isOutOfStock: false,
      isLowStock: false,
      maxPurchasableQty: null,
      availableQty: null,
    }
  }

  const safeQty = Math.max(0, Math.floor(inventoryQty || 0))
  return {
    isUnlimited: false,
    isOutOfStock: safeQty === 0,
    isLowStock: safeQty > 0 && safeQty <= threshold,
    maxPurchasableQty: safeQty,
    availableQty: safeQty,
  }
}

/**
 * Checks whether a requested purchase quantity can be fulfilled for a product.
 */
export function canFulfillQuantity(
  inventoryQty: number,
  requestedQty: number,
  isActive: boolean = true
): boolean {
  if (!isActive) return false
  if (typeof requestedQty !== "number" || !Number.isInteger(requestedQty) || requestedQty <= 0) {
    return false
  }
  if (isUnlimitedStock(inventoryQty)) {
    return true
  }
  return inventoryQty >= requestedQty
}

/**
 * Safely parses product images JSON or fallback string into an array of non-empty URLs.
 */
export function parseImagesList(rawImages?: string | null): string[] {
  if (!rawImages) return []
  try {
    const parsed = JSON.parse(rawImages)
    if (Array.isArray(parsed)) {
      return parsed
        .map((img) => String(img || "").trim())
        .filter(Boolean)
    }
  } catch {
    const trimmed = String(rawImages).trim()
    if (trimmed) return [trimmed]
  }
  return []
}

/**
 * Safely parses sizes/variations JSON or comma-separated string into a clean string array.
 */
export function parseStringList(raw?: string | string[] | null): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((s) => String(s || "").trim()).filter(Boolean)))
  }
  const str = String(raw).trim()
  if (!str) return []
  try {
    const parsed = JSON.parse(str)
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed.map((s) => String(s || "").trim()).filter(Boolean)))
    }
  } catch {
    // Fallback to comma-separated parsing
  }
  return Array.from(
    new Set(
      str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  )
}

/**
 * Normalizes category to canonical lowercase slug used by storefront collections.
 */
export function normalizeCategory(category?: string | null): string {
  const clean = String(category || "").trim().toLowerCase()
  return clean || "rings"
}

/**
 * Formats category for display in Admin table (e.g. "rings" -> "Rings").
 */
export function formatCategoryLabel(category?: string | null): string {
  const clean = String(category || "").trim()
  if (!clean) return "Uncategorized"
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
}

/**
 * Parses the extended catalog metadata JSON stored in SiteSettings.
 */
export function parseCatalogMetadata(rawJson?: string | null): CatalogMetadataStore {
  const fallback: CatalogMetadataStore = {
    lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    products: {},
  }
  if (!rawJson) return fallback
  try {
    const parsed = JSON.parse(rawJson)
    if (!parsed || typeof parsed !== "object") return fallback
    return {
      lowStockThreshold: normalizeLowStockThreshold(parsed.lowStockThreshold),
      products:
        parsed.products && typeof parsed.products === "object" ? parsed.products : {},
    }
  } catch {
    return fallback
  }
}

/**
 * Serializes catalog metadata store to JSON.
 */
export function serializeCatalogMetadata(store: CatalogMetadataStore): string {
  return JSON.stringify({
    lowStockThreshold: normalizeLowStockThreshold(store.lowStockThreshold),
    products: store.products || {},
  })
}

/**
 * Resolves the real SKU saved for a product without ever falling back to the URL slug
 * or generating invented codes.
 * - Returns null if rawSku is empty, whitespace-only, identical to the product's URL slug,
 *   or an incomplete trailing-hyphen slug artifact (such as "cuban-bracelet-").
 */
export function resolveRealProductSku(
  rawSku?: string | null,
  slug?: string | null
): string | null {
  if (rawSku === undefined || rawSku === null) return null
  const cleanSku = String(rawSku).trim()
  if (!cleanSku) return null

  const cleanSlug = String(slug || "").trim()
  if (cleanSlug && cleanSku.toLowerCase() === cleanSlug.toLowerCase()) {
    return null
  }

  // Filter out incomplete slug artifacts ending with a trailing hyphen (e.g., "cuban-bracelet-")
  if (
    cleanSku.endsWith("-") &&
    (/^[a-z0-9]+(-[a-z0-9]+)*-$/.test(cleanSku) ||
      (cleanSlug && cleanSlug.toLowerCase().startsWith(cleanSku.toLowerCase())))
  ) {
    return null
  }

  return cleanSku
}

/**
 * Extracts a clean display label and an optional inline SKU if a variant string
 * uses inline notation such as:
 * - "7\" (SKU: MG-CB-7)"
 * - "7\" [SKU: MG-CB-7]"
 * - "18\" :: MG-CHAIN-18"
 */
export function parseVariantOptionAndSku(rawOption: string): {
  label: string
  inlineSku: string | null
} {
  const str = String(rawOption || "").trim()
  if (!str) return { label: "", inlineSku: null }

  const parenMatch = str.match(/^(.*?)\s*\(\s*SKU\s*:\s*([^)]+)\)\s*$/i)
  if (parenMatch) {
    const label = parenMatch[1].trim()
    const inlineSku = parenMatch[2].trim()
    return { label: label || str, inlineSku: inlineSku || null }
  }

  const bracketMatch = str.match(/^(.*?)\s*\[\s*SKU\s*:\s*([^\]]+)\]\s*$/i)
  if (bracketMatch) {
    const label = bracketMatch[1].trim()
    const inlineSku = bracketMatch[2].trim()
    return { label: label || str, inlineSku: inlineSku || null }
  }

  const doubleColonMatch = str.match(/^(.*?)\s*::\s*(.+)$/)
  if (doubleColonMatch) {
    const label = doubleColonMatch[1].trim()
    const inlineSku = doubleColonMatch[2].trim()
    return { label: label || str, inlineSku: inlineSku || null }
  }

  return { label: str, inlineSku: null }
}

/**
 * Normalizes a variantSkus dictionary, stripping empty keys/values and slug fallbacks.
 */
export function normalizeVariantSkusMap(
  rawMap?: Record<string, string> | null,
  slug?: string | null
): Record<string, string> {
  if (!rawMap || typeof rawMap !== "object") return {}
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(rawMap)) {
    const cleanKey = String(key || "").trim()
    const realSku = resolveRealProductSku(val, slug)
    if (cleanKey && realSku) {
      out[cleanKey] = realSku
    }
  }
  return out
}

/**
 * Resolves the active SKU to display on the Product Detail page:
 * - If the selected variant (size, length, or variation) has its own SKU in variantSkus
 *   or inline notation, returns that variant's real SKU.
 * - Otherwise returns the product's real base SKU.
 * - Returns null if no real SKU exists (so the UI hides the SKU row).
 */
export function resolveActiveProductSku(params: {
  baseSku?: string | null
  slug?: string | null
  variantSkus?: Record<string, string> | null
  selection?: VariantSkuSelection
}): string | null {
  const { baseSku, slug, variantSkus, selection } = params
  const cleanMap = normalizeVariantSkusMap(variantSkus, slug)

  // Build case-insensitive lookup table for variantSkus
  const lowerLookup = new Map<string, string>()
  for (const [k, v] of Object.entries(cleanMap)) {
    lowerLookup.set(k.toLowerCase(), v)
  }

  if (selection) {
    const rawSize = selection.size ? String(selection.size).trim() : ""
    const rawLength = selection.length ? String(selection.length).trim() : ""
    const rawVariation = selection.variation ? String(selection.variation).trim() : ""

    const parsedSize = parseVariantOptionAndSku(rawSize)
    const parsedLength = parseVariantOptionAndSku(rawLength)
    const parsedVariation = parseVariantOptionAndSku(rawVariation)

    // 1. Check combined variant keys first (most specific)
    const combinedCandidates = [
      [parsedSize.label, parsedLength.label, parsedVariation.label].filter(Boolean).join("|"),
      [rawSize, rawLength, rawVariation].filter(Boolean).join("|"),
    ].filter(Boolean)

    for (const candidate of combinedCandidates) {
      const hit = lowerLookup.get(candidate.toLowerCase())
      if (hit) return hit
    }

    // 2. Check specific selected variant dimensions (variation -> length -> size)
    const singleCandidates: string[] = []
    if (rawVariation) {
      singleCandidates.push(
        `variation:${rawVariation}`,
        `variation:${parsedVariation.label}`,
        rawVariation,
        parsedVariation.label
      )
    }
    if (rawLength) {
      singleCandidates.push(
        `length:${rawLength}`,
        `length:${parsedLength.label}`,
        rawLength,
        parsedLength.label
      )
    }
    if (rawSize) {
      singleCandidates.push(
        `size:${rawSize}`,
        `size:${parsedSize.label}`,
        rawSize,
        parsedSize.label
      )
    }

    for (const candidate of singleCandidates) {
      const hit = lowerLookup.get(candidate.toLowerCase())
      if (hit) return hit
    }

    // 3. Check inline SKU embedded in the selected option string
    const inlineHit =
      resolveRealProductSku(parsedVariation.inlineSku, slug) ||
      resolveRealProductSku(parsedLength.inlineSku, slug) ||
      resolveRealProductSku(parsedSize.inlineSku, slug)
    if (inlineHit) {
      return inlineHit
    }
  }

  return resolveRealProductSku(baseSku, slug)
}
