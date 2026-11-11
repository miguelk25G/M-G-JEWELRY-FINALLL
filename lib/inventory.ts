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
  material?: string
  metalColor?: string
  lengths?: string[]
  variations?: string[]
  lowStockThreshold?: number
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
