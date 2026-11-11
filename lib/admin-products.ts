import {
  CATALOG_METADATA_SETTINGS_ID,
  DEFAULT_LOW_STOCK_THRESHOLD,
  type CatalogMetadataStore,
  type ProductExtendedMeta,
  type StockMode,
  adjustLimitedStock,
  formatCategoryLabel,
  getAdminStockDisplay,
  getStockMode,
  isUnlimitedStock,
  normalizeCategory,
  normalizeInventoryInput,
  normalizeLowStockThreshold,
  normalizeVariantSkusMap,
  parseCatalogMetadata,
  parseImagesList,
  parseStringList,
  resolveRealProductSku,
  serializeCatalogMetadata,
} from "@/lib/inventory"

export interface UpdateProductInput {
  id: string
  name: string
  nameEs?: string | null
  description: string
  descriptionEs?: string | null
  sku?: string | null
  variantSkus?: Record<string, string> | null
  category: string
  price: number | string
  comparePrice?: number | string | null
  images: string[] | string
  material?: string | null
  karat?: string | null
  metalColor?: string | null
  metalType?: string | null
  stoneType?: string | null
  weight?: number | string | null
  length?: number | string | null
  sizes?: string[] | string | null
  lengths?: string[] | string | null
  variations?: string[] | string | null
  isActive?: boolean
  isFeatured?: boolean
  isBestSeller?: boolean
  stockMode: StockMode | string
  inventoryQty?: number | string | null
  lowStockThreshold?: number | string | null
}

export interface CreateProductInput extends Omit<UpdateProductInput, "id"> {
  slug?: string | null
}

export interface UpdateInventoryInput {
  productId: string
  stockMode: StockMode | string
  quantity?: number | string | null
  adjustDelta?: number
  lowStockThreshold?: number | string | null
}

function parseOptionalPositiveFloat(val: number | string | null | undefined, fieldName: string, allowZero = false): number | null {
  if (val === undefined || val === null || String(val).trim() === "") {
    return null
  }
  const cleaned = typeof val === "number" ? val : String(val).trim().replace(/\s*(g|gr|grams|in|inch|inches|")$/i, "")
  const num = typeof cleaned === "number" ? cleaned : Number(cleaned)
  if (!Number.isFinite(num) || (allowZero ? num < 0 : num <= 0)) {
    throw new Error(`${fieldName} must be a valid ${allowZero ? "non-negative" : "positive"} number.`)
  }
  return Math.round(num * 100) / 100
}

export function createAdminProductService(db: any) {
  async function getCatalogMetadata(): Promise<CatalogMetadataStore> {
    try {
      if (!db.siteSettings || typeof db.siteSettings.findUnique !== "function") {
        return { lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD, products: {} }
      }
      const row = await db.siteSettings.findUnique({
        where: { id: CATALOG_METADATA_SETTINGS_ID },
      })
      return parseCatalogMetadata(row?.shippingInfo)
    } catch {
      return { lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD, products: {} }
    }
  }

  async function saveCatalogMetadata(store: CatalogMetadataStore): Promise<void> {
    try {
      if (!db.siteSettings || typeof db.siteSettings.upsert !== "function") {
        return
      }
      const serialized = serializeCatalogMetadata(store)
      await db.siteSettings.upsert({
        where: { id: CATALOG_METADATA_SETTINGS_ID },
        update: { shippingInfo: serialized },
        create: {
          id: CATALOG_METADATA_SETTINGS_ID,
          siteName: "M&G Jewelry Catalog Metadata",
          shippingInfo: serialized,
        },
      })
    } catch (err) {
      console.error("[AdminProductService] Failed to persist extended metadata:", err)
    }
  }

  async function formatProductForAdmin(p: any, metaStore?: CatalogMetadataStore) {
    const store = metaStore || (await getCatalogMetadata())
    const prodMeta: ProductExtendedMeta = store.products[p.id] || {}
    const imagesList = parseImagesList(p.images)
    const sizesList = parseStringList(p.sizes)
    const lengthsList = parseStringList(prodMeta.lengths)
    const variationsList = parseStringList(prodMeta.variations)
    const threshold = normalizeLowStockThreshold(
      prodMeta.lowStockThreshold ?? store.lowStockThreshold
    )
    const stockDisplay = getAdminStockDisplay(p.inventoryQty, threshold)

    const realSku = resolveRealProductSku(prodMeta.sku, p.slug)
    const variantSkus = normalizeVariantSkusMap(prodMeta.variantSkus, p.slug)

    return {
      id: p.id,
      name: p.name,
      nameEs: p.nameEs || "",
      slug: p.slug,
      sku: realSku || "",
      variantSkus,
      description: p.description || "",
      descriptionEs: p.descriptionEs || "",
      category: normalizeCategory(p.category),
      categoryLabel: formatCategoryLabel(p.category),
      price: p.price,
      comparePrice: p.comparePrice ?? null,
      currency: p.currency || "USD",
      metalType: p.metalType || "Yellow Gold",
      metalColor: prodMeta.metalColor || p.metalType || "Yellow Gold",
      karat: p.karat || "",
      material: prodMeta.material || p.karat || "",
      stoneType: p.stoneType || "none",
      weight: p.weight ?? null,
      length: p.length ?? null,
      sizes: sizesList,
      lengths: lengthsList,
      variations: variationsList,
      images: imagesList,
      image: imagesList[0] || "/placeholder.svg",
      isActive: Boolean(p.isActive),
      isFeatured: Boolean(p.isFeatured),
      isBestSeller: Boolean(p.isBestSeller),
      status: p.isActive ? "Active" : "Inactive",
      stock: p.inventoryQty,
      stockMode: getStockMode(p.inventoryQty),
      isUnlimited: isUnlimitedStock(p.inventoryQty),
      stockDisplay,
      lowStockThreshold: threshold,
    }
  }

  async function updateProduct(input: UpdateProductInput) {
    if (!input.id) {
      throw new Error("Product ID is required.")
    }

    const existing = await db.product.findUnique({
      where: { id: input.id },
    })

    if (!existing) {
      throw new Error("Product not found.")
    }

    const name = String(input.name || "").trim()
    if (!name) {
      throw new Error("Product name is required.")
    }

    const description = String(input.description || "").trim()
    if (!description) {
      throw new Error("Product description is required.")
    }

    const price = parseOptionalPositiveFloat(input.price, "Selling price", false)
    if (price === null || price <= 0) {
      throw new Error("Selling price must be greater than $0.00 USD.")
    }

    const comparePrice = parseOptionalPositiveFloat(input.comparePrice, "Compare price", true)
    const weight = parseOptionalPositiveFloat(input.weight, "Product weight", false)
    const length = parseOptionalPositiveFloat(input.length, "Product length", false)

    const category = normalizeCategory(input.category || existing.category)

    const imagesList = parseImagesList(
      Array.isArray(input.images) ? JSON.stringify(input.images) : input.images
    )
    if (imagesList.length === 0) {
      throw new Error("At least one product image is required.")
    }

    const inventoryQty = normalizeInventoryInput(input.stockMode, input.inventoryQty)

    const materialStr = String(input.material ?? input.karat ?? existing.karat ?? "").trim()
    const metalColorStr = String(
      input.metalColor ?? input.metalType ?? existing.metalType ?? "Yellow Gold"
    ).trim()
    const stoneTypeStr = String(input.stoneType ?? existing.stoneType ?? "none").trim() || "none"

    const sizesList = parseStringList(input.sizes)
    const lengthsList = parseStringList(input.lengths)
    const variationsList = parseStringList(input.variations)

    const isActive =
      input.isActive !== undefined ? Boolean(input.isActive) : Boolean(existing.isActive)
    const isFeatured =
      input.isFeatured !== undefined ? Boolean(input.isFeatured) : Boolean(existing.isFeatured)
    const isBestSeller =
      input.isBestSeller !== undefined
        ? Boolean(input.isBestSeller)
        : Boolean(existing.isBestSeller)

    // Update the existing product record in the database while strictly preserving id and slug (URL)
    const updatedProduct = await db.product.update({
      where: { id: existing.id },
      data: {
        name,
        nameEs: input.nameEs !== undefined ? (String(input.nameEs || "").trim() || null) : existing.nameEs,
        description,
        descriptionEs:
          input.descriptionEs !== undefined
            ? (String(input.descriptionEs || "").trim() || null)
            : existing.descriptionEs,
        price,
        comparePrice,
        category,
        metalType: metalColorStr || "Yellow Gold",
        karat: materialStr || null,
        stoneType: stoneTypeStr,
        images: JSON.stringify(imagesList),
        weight,
        length,
        sizes: sizesList.length > 0 ? JSON.stringify(sizesList) : null,
        isActive,
        isFeatured,
        isBestSeller,
        inventoryQty,
      },
    })

    // Update extended catalog metadata (SKU, variantSkus, material, metalColor, lengths, variations, threshold)
    const metaStore = await getCatalogMetadata()
    const currentMeta = metaStore.products[existing.id] || {}
    const rawSku = input.sku !== undefined ? input.sku : currentMeta.sku
    const cleanSku = resolveRealProductSku(rawSku, existing.slug) || undefined
    const rawVariantSkus =
      input.variantSkus !== undefined ? input.variantSkus : currentMeta.variantSkus
    const cleanVariantSkus = normalizeVariantSkusMap(rawVariantSkus, existing.slug)

    const updatedMeta: ProductExtendedMeta = {
      ...currentMeta,
      sku: cleanSku,
      variantSkus: Object.keys(cleanVariantSkus).length > 0 ? cleanVariantSkus : undefined,
      material: materialStr || undefined,
      metalColor: metalColorStr || undefined,
      lengths: lengthsList,
      variations: variationsList,
    }

    if (input.lowStockThreshold !== undefined && input.lowStockThreshold !== null && String(input.lowStockThreshold).trim() !== "") {
      updatedMeta.lowStockThreshold = normalizeLowStockThreshold(input.lowStockThreshold)
      metaStore.lowStockThreshold = updatedMeta.lowStockThreshold
    }

    metaStore.products[existing.id] = updatedMeta
    await saveCatalogMetadata(metaStore)

    const formatted = await formatProductForAdmin(updatedProduct, metaStore)
    return {
      success: true,
      product: formatted,
      previousCategory: existing.category,
    }
  }

  async function updateInventory(input: UpdateInventoryInput) {
    if (!input.productId) {
      throw new Error("Product ID is required.")
    }

    const existing = await db.product.findUnique({
      where: { id: input.productId },
    })

    if (!existing) {
      throw new Error("Product not found.")
    }

    const mode = String(input.stockMode || "limited").toLowerCase().trim() as StockMode
    let finalInventoryQty: number

    if (mode === "unlimited") {
      finalInventoryQty = normalizeInventoryInput("unlimited")
    } else if (input.adjustDelta !== undefined && input.quantity === undefined) {
      finalInventoryQty = adjustLimitedStock(existing.inventoryQty, input.adjustDelta)
    } else {
      finalInventoryQty = normalizeInventoryInput("limited", input.quantity)
    }

    const updatedProduct = await db.product.update({
      where: { id: existing.id },
      data: {
        inventoryQty: finalInventoryQty,
      },
    })

    const metaStore = await getCatalogMetadata()
    if (
      input.lowStockThreshold !== undefined &&
      input.lowStockThreshold !== null &&
      String(input.lowStockThreshold).trim() !== ""
    ) {
      const normalizedThreshold = normalizeLowStockThreshold(input.lowStockThreshold)
      metaStore.lowStockThreshold = normalizedThreshold
      metaStore.products[existing.id] = {
        ...(metaStore.products[existing.id] || {}),
        lowStockThreshold: normalizedThreshold,
      }
      await saveCatalogMetadata(metaStore)
    }

    const formatted = await formatProductForAdmin(updatedProduct, metaStore)
    return {
      success: true,
      product: formatted,
    }
  }

  async function setProductStatus(productId: string, isActive: boolean) {
    if (!productId) {
      throw new Error("Product ID is required.")
    }

    const existing = await db.product.findUnique({
      where: { id: productId },
    })

    if (!existing) {
      throw new Error("Product not found.")
    }

    const updatedProduct = await db.product.update({
      where: { id: existing.id },
      data: { isActive: Boolean(isActive) },
    })

    const formatted = await formatProductForAdmin(updatedProduct)
    return {
      success: true,
      product: formatted,
    }
  }

  async function setGlobalLowStockThreshold(threshold: number | string) {
    const normalized = normalizeLowStockThreshold(threshold)
    const metaStore = await getCatalogMetadata()
    metaStore.lowStockThreshold = normalized
    await saveCatalogMetadata(metaStore)
    return {
      success: true,
      lowStockThreshold: normalized,
    }
  }

  return {
    getCatalogMetadata,
    saveCatalogMetadata,
    formatProductForAdmin,
    updateProduct,
    updateInventory,
    setProductStatus,
    setGlobalLowStockThreshold,
  }
}
