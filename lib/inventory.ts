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

export type VariantType = "length" | "ring_size" | "bracelet_size" | "custom"

export interface VariantTypeOption {
  value: VariantType
  label: string
  labelEs: string
  selectorLabelEn: string
  selectorLabelEs: string
  selectedPrefixEn: string
  selectedPrefixEs: string
  placeholder: string
}

export const VARIANT_TYPE_OPTIONS: VariantTypeOption[] = [
  {
    value: "length",
    label: "Length (inches)",
    labelEs: "Longitud (pulgadas)",
    selectorLabelEn: "Select Length",
    selectorLabelEs: "Seleccionar longitud",
    selectedPrefixEn: "Length",
    selectedPrefixEs: "Longitud",
    placeholder: 'e.g. 18", 20", 22"',
  },
  {
    value: "ring_size",
    label: "Ring Size",
    labelEs: "Talla de anillo",
    selectorLabelEn: "Select Size",
    selectorLabelEs: "Seleccionar talla",
    selectedPrefixEn: "Size",
    selectedPrefixEs: "Talla",
    placeholder: "e.g. 6, 7, 8",
  },
  {
    value: "bracelet_size",
    label: "Bracelet Size",
    labelEs: "Talla de pulsera",
    selectorLabelEn: "Select Size",
    selectorLabelEs: "Seleccionar talla",
    selectedPrefixEn: "Size",
    selectedPrefixEs: "Talla",
    placeholder: 'e.g. 7", 7.5", 8"',
  },
  {
    value: "custom",
    label: "Custom Size",
    labelEs: "Tamaño personalizado",
    selectorLabelEn: "Select Size",
    selectorLabelEs: "Seleccionar talla",
    selectedPrefixEn: "Size",
    selectedPrefixEs: "Talla",
    placeholder: "e.g. Small, Medium, 20 inches",
  },
]

export interface ProductVariantInput {
  id?: string | null
  size: string
  variantType?: VariantType | string | null
  price: number | string
  comparePrice?: number | string | null
  weight?: number | string | null
  sku?: string | null
  stockQuantity?: number | string | null
  inventoryQty?: number | string | null
  isUnlimited?: boolean
  stockMode?: StockMode | string | null
  isActive?: boolean
  sortOrder?: number
}

export interface ProductVariantRecord {
  id: string
  productId?: string
  size: string
  variantType: VariantType
  price: number
  comparePrice: number | null
  weight: number | null
  sku: string
  inventoryQty: number
  stockMode: StockMode
  isUnlimited: boolean
  isActive: boolean
  sortOrder: number
}

export interface ProductExtendedMeta {
  sku?: string
  variantSkus?: Record<string, string>
  material?: string
  metalColor?: string
  lengths?: string[]
  variations?: string[]
  lowStockThreshold?: number
  hasVariants?: boolean
  variantType?: VariantType
  variants?: ProductVariantRecord[]
}

export interface VariantSkuSelection {
  variantId?: string | null
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

/**
 * Normalizes a variantType string into one of the canonical VariantType values.
 */
export function normalizeVariantType(raw?: string | null): VariantType {
  if (!raw) return "length"
  const clean = String(raw).trim().toLowerCase()
  if (clean === "ring_size" || clean === "ring size" || clean === "rings") return "ring_size"
  if (clean === "bracelet_size" || clean === "bracelet size" || clean === "bracelets") return "bracelet_size"
  if (clean === "custom" || clean === "custom size" || clean === "custom_size") return "custom"
  if (clean === "length" || clean === "length (inches)" || clean === "chains" || clean === "necklaces") return "length"
  return "length"
}

/**
 * Returns localized UI metadata for a given VariantType.
 */
export function getVariantTypeOption(raw?: string | null): VariantTypeOption {
  const normalized = normalizeVariantType(raw)
  return VARIANT_TYPE_OPTIONS.find((opt) => opt.value === normalized) || VARIANT_TYPE_OPTIONS[0]
}

/**
 * Formats a database or metadata variant row into a normalized ProductVariantRecord without throwing.
 */
export function coerceVariantRecord(raw: any, index = 0, fallbackVariantType: VariantType = "length"): ProductVariantRecord {
  const inventoryQty =
    typeof raw?.inventoryQty === "number" && Number.isFinite(raw.inventoryQty)
      ? Math.trunc(raw.inventoryQty)
      : raw?.isUnlimited || String(raw?.stockMode || "").toLowerCase() === "unlimited"
      ? UNLIMITED_STOCK_SENTINEL
      : Math.max(0, Math.trunc(Number(raw?.stockQuantity ?? raw?.stock ?? 0) || 0))

  const unlimited = isUnlimitedStock(inventoryQty)
  const priceNum = Number(raw?.price)
  const compareNum =
    raw?.comparePrice !== undefined && raw?.comparePrice !== null && String(raw.comparePrice).trim() !== ""
      ? Number(raw.comparePrice)
      : null
  const weightNum =
    raw?.weight !== undefined && raw?.weight !== null && String(raw.weight).trim() !== ""
      ? Number(raw.weight)
      : null

  return {
    id: String(raw?.id || `var_${index + 1}`),
    productId: raw?.productId ? String(raw.productId) : undefined,
    size: String(raw?.size || "").trim(),
    variantType: normalizeVariantType(raw?.variantType || fallbackVariantType),
    price: Number.isFinite(priceNum) && priceNum > 0 ? Math.round(priceNum * 100) / 100 : 0,
    comparePrice:
      compareNum !== null && Number.isFinite(compareNum) && compareNum > 0
        ? Math.round(compareNum * 100) / 100
        : null,
    weight:
      weightNum !== null && Number.isFinite(weightNum) && weightNum > 0
        ? Math.round(weightNum * 100) / 100
        : null,
    sku: String(raw?.sku || "").trim(),
    inventoryQty,
    stockMode: unlimited ? "unlimited" : "limited",
    isUnlimited: unlimited,
    isActive: raw?.isActive === undefined ? true : Boolean(raw.isActive),
    sortOrder: typeof raw?.sortOrder === "number" ? raw.sortOrder : index,
  }
}

/**
 * Strictly validates and normalizes an array of variant inputs for Admin Product creation & editing.
 * Enforces:
 * - Missing size labels check
 * - Duplicate size labels check within the product
 * - Invalid selling prices check (> $0.00 USD)
 * - Invalid compare-at prices check (>= 0 when provided)
 * - Invalid weights check (> 0 grams when provided)
 * - Negative or non-integer stock quantities check
 * - Duplicate variant SKUs check (within product and across existing catalog SKUs)
 */
export function validateAndNormalizeVariants(
  rawVariants: ProductVariantInput[] | string | null | undefined,
  variantTypeInput?: VariantType | string | null,
  options?: {
    slug?: string | null
    existingExternalSkus?: Set<string>
  }
): ProductVariantRecord[] {
  let list: ProductVariantInput[] = []
  if (typeof rawVariants === "string") {
    try {
      const parsed = JSON.parse(rawVariants)
      if (Array.isArray(parsed)) list = parsed
    } catch {
      throw new Error("Invalid variants data format.")
    }
  } else if (Array.isArray(rawVariants)) {
    list = rawVariants
  }

  if (list.length === 0) {
    throw new Error("Please add at least one product variant when variants are enabled.")
  }

  const normalizedType = normalizeVariantType(variantTypeInput)
  const seenSizes = new Set<string>()
  const seenSkus = new Set<string>()
  const externalSkus = options?.existingExternalSkus || new Set<string>()
  const normalizedRecords: ProductVariantRecord[] = []

  list.forEach((item, index) => {
    const rowNum = index + 1
    const size = String(item?.size ?? "").trim()
    if (!size) {
      throw new Error(`Missing size or length label on Variant #${rowNum}. Every variant requires a size or length.`)
    }

    const sizeKey = size.toLowerCase()
    if (seenSizes.has(sizeKey)) {
      throw new Error(`Duplicate size or length "${size}" on Variant #${rowNum}. Each variant must have a unique size/length.`)
    }
    seenSizes.add(sizeKey)

    // Selling Price validation
    const rawPriceStr = item?.price !== undefined && item?.price !== null ? String(item.price).trim() : ""
    const parsedPrice = rawPriceStr === "" ? NaN : Number(rawPriceStr)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new Error(`Invalid selling price for variant "${size}" (Variant #${rowNum}). Price must be greater than $0.00 USD.`)
    }
    const price = Math.round(parsedPrice * 100) / 100

    // Compare-at Price validation (optional)
    let comparePrice: number | null = null
    const rawCompareStr =
      item?.comparePrice !== undefined && item?.comparePrice !== null
        ? String(item.comparePrice).trim()
        : ""
    if (rawCompareStr !== "") {
      const parsedCompare = Number(rawCompareStr)
      if (!Number.isFinite(parsedCompare) || parsedCompare < 0) {
        throw new Error(`Invalid compare-at price for variant "${size}" (Variant #${rowNum}). Must be a non-negative number.`)
      }
      comparePrice = parsedCompare > 0 ? Math.round(parsedCompare * 100) / 100 : null
    }

    // Weight validation (optional, in grams)
    let weight: number | null = null
    const rawWeightStr =
      item?.weight !== undefined && item?.weight !== null
        ? String(item.weight).trim().replace(/\s*(g|gr|grams)$/i, "")
        : ""
    if (rawWeightStr !== "") {
      const parsedWeight = Number(rawWeightStr)
      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        throw new Error(`Invalid weight for variant "${size}" (Variant #${rowNum}). Weight must be a positive number in grams.`)
      }
      weight = Math.round(parsedWeight * 100) / 100
    }

    // SKU validation (unique per variant)
    const rawSku = String(item?.sku ?? "").trim()
    const cleanSku = resolveRealProductSku(rawSku, options?.slug) || rawSku
    if (cleanSku) {
      const skuKey = cleanSku.toLowerCase()
      if (seenSkus.has(skuKey)) {
        throw new Error(`Duplicate variant SKU "${cleanSku}" on Variant #${rowNum} ("${size}"). Each variant must have a unique SKU.`)
      }
      if (externalSkus.has(skuKey)) {
        throw new Error(`Duplicate variant SKU "${cleanSku}" on Variant #${rowNum} ("${size}") is already assigned to another product.`)
      }
      seenSkus.add(skuKey)
    }

    // Stock Quantity & Unlimited Stock validation
    const isUnlimited =
      Boolean(item?.isUnlimited) ||
      String(item?.stockMode || "").toLowerCase().trim() === "unlimited" ||
      (item?.inventoryQty !== undefined &&
        item?.inventoryQty !== null &&
        String(item.inventoryQty).trim() !== "" &&
        Number(item.inventoryQty) === UNLIMITED_STOCK_SENTINEL &&
        item?.stockQuantity === undefined)

    let inventoryQty = UNLIMITED_STOCK_SENTINEL
    if (!isUnlimited) {
      const rawQty =
        item?.stockQuantity !== undefined && item?.stockQuantity !== null && String(item.stockQuantity).trim() !== ""
          ? item.stockQuantity
          : item?.inventoryQty
      if (rawQty === undefined || rawQty === null || String(rawQty).trim() === "") {
        throw new Error(`Missing stock quantity for variant "${size}" (Variant #${rowNum}). Enter a non-negative whole number or enable Unlimited Stock.`)
      }
      const parsedQty = Number(String(rawQty).trim())
      if (!Number.isFinite(parsedQty) || !Number.isInteger(parsedQty)) {
        throw new Error(`Invalid stock quantity for variant "${size}" (Variant #${rowNum}). Stock quantity must be a whole number.`)
      }
      if (parsedQty < 0) {
        throw new Error(`Negative stock quantity is not allowed for variant "${size}" (Variant #${rowNum}).`)
      }
      inventoryQty = parsedQty
    }

    const isActive = item?.isActive === undefined ? true : Boolean(item.isActive)
    const cleanId =
      item?.id && String(item.id).trim() && !String(item.id).startsWith("temp_")
        ? String(item.id).trim()
        : `var_${Date.now().toString(36)}_${index + 1}_${Math.random().toString(36).slice(2, 6)}`

    normalizedRecords.push({
      id: cleanId,
      size,
      variantType: normalizedType,
      price,
      comparePrice,
      weight,
      sku: cleanSku,
      inventoryQty,
      stockMode: isUnlimited ? "unlimited" : "limited",
      isUnlimited,
      isActive,
      sortOrder: index,
    })
  })

  return normalizedRecords
}

/**
 * Computes aggregate parent Product fields (price, comparePrice, weight, inventoryQty, sizes)
 * from the product's variants list so storefront cards, search filters, and legacy queries remain consistent.
 */
export function computeAggregateProductStateFromVariants(variants: ProductVariantRecord[]): {
  price: number
  comparePrice: number | null
  weight: number | null
  inventoryQty: number
  sizes: string[]
  variantSkus: Record<string, string>
} {
  const activeVariants = variants.filter((v) => v.isActive)
  const pool = activeVariants.length > 0 ? activeVariants : variants

  // Sort pool by price ascending to find lead/starting variant
  const sortedByPrice = [...pool].sort((a, b) => a.price - b.price)
  const lead = sortedByPrice[0]

  const price = lead ? lead.price : 0
  const comparePrice = lead ? lead.comparePrice : null
  const weight = lead ? lead.weight : null

  let inventoryQty = 0
  if (activeVariants.length === 0) {
    inventoryQty = 0
  } else if (activeVariants.some((v) => isUnlimitedStock(v.inventoryQty))) {
    inventoryQty = UNLIMITED_STOCK_SENTINEL
  } else {
    inventoryQty = activeVariants.reduce(
      (sum, v) => sum + Math.max(0, Math.floor(v.inventoryQty || 0)),
      0
    )
  }

  const sizes = activeVariants.map((v) => v.size)
  const variantSkus: Record<string, string> = {}
  for (const v of variants) {
    if (v.size && v.sku) {
      variantSkus[v.size] = v.sku
    }
  }

  return {
    price,
    comparePrice,
    weight,
    inventoryQty,
    sizes,
    variantSkus,
  }
}

/**
 * Resolves a specific variant from a product's variants array by variantId or size label.
 */
export function resolveProductVariant(
  variants: ProductVariantRecord[] | undefined | null,
  selection: { variantId?: string | null; id?: string | null; size?: string | null },
  requireActive = true
): ProductVariantRecord | null {
  if (!Array.isArray(variants) || variants.length === 0) return null
  const pool = requireActive ? variants.filter((v) => v.isActive) : variants

  const targetId = selection.variantId || selection.id
  if (targetId) {
    const cleanId = String(targetId).trim()
    const byId = pool.find((v) => v.id === cleanId)
    if (byId) return byId
  }

  if (selection.size) {
    const cleanSize = String(selection.size).trim().toLowerCase()
    const parsedLabel = parseVariantOptionAndSku(cleanSize).label.toLowerCase()
    const bySize = pool.find(
      (v) => v.size.trim().toLowerCase() === cleanSize || v.size.trim().toLowerCase() === parsedLabel
    )
    if (bySize) return bySize
  }

  return null
}

