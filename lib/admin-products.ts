import {
  CATALOG_METADATA_SETTINGS_ID,
  DEFAULT_LOW_STOCK_THRESHOLD,
  type CatalogMetadataStore,
  type ProductExtendedMeta,
  type ProductVariantInput,
  type ProductVariantRecord,
  type StockMode,
  type VariantType,
  adjustLimitedStock,
  coerceVariantRecord,
  computeAggregateProductStateFromVariants,
  formatCategoryLabel,
  getAdminStockDisplay,
  getStockMode,
  isUnlimitedStock,
  normalizeCategory,
  normalizeInventoryInput,
  normalizeLowStockThreshold,
  normalizeVariantSkusMap,
  normalizeVariantType,
  parseCatalogMetadata,
  parseImagesList,
  parseStringList,
  resolveRealProductSku,
  serializeCatalogMetadata,
  validateAndNormalizeVariants,
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
  price?: number | string | null
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
  stockMode?: StockMode | string
  inventoryQty?: number | string | null
  lowStockThreshold?: number | string | null
  hasVariants?: boolean
  variantType?: VariantType | string | null
  variants?: ProductVariantInput[] | string | null
}

export interface CreateProductInput extends Omit<UpdateProductInput, "id"> {
  slug?: string | null
}

export interface VariantInventoryUpdate {
  id: string
  stockMode: StockMode | string
  quantity?: number | string | null
  isActive?: boolean
}

export interface UpdateInventoryInput {
  productId: string
  stockMode?: StockMode | string
  quantity?: number | string | null
  adjustDelta?: number
  lowStockThreshold?: number | string | null
  variantStocks?: VariantInventoryUpdate[]
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

  async function getProductVariants(
    productId: string,
    metaStore?: CatalogMetadataStore
  ): Promise<{
    hasVariants: boolean
    variantType: VariantType
    variants: ProductVariantRecord[]
  }> {
    const store = metaStore || (await getCatalogMetadata())
    const prodMeta: ProductExtendedMeta = store.products[productId] || {}
    const fallbackType = normalizeVariantType(prodMeta.variantType)

    // 1. Try reading from relational ProductVariant table first
    if (db.productVariant && typeof db.productVariant.findMany === "function") {
      try {
        const rows = await db.productVariant.findMany({
          where: { productId },
          orderBy: { sortOrder: "asc" },
        })
        if (Array.isArray(rows) && rows.length > 0) {
          const normalized = rows.map((r: any, idx: number) =>
            coerceVariantRecord(r, idx, fallbackType)
          )
          return {
            hasVariants: true,
            variantType: normalized[0]?.variantType || fallbackType,
            variants: normalized,
          }
        }
      } catch {
        // Fallback to CatalogMetadataStore if table is not yet migrated
      }
    }

    // 2. Fallback to CatalogMetadataStore
    if (prodMeta.hasVariants && Array.isArray(prodMeta.variants) && prodMeta.variants.length > 0) {
      const normalized = prodMeta.variants.map((v, idx) =>
        coerceVariantRecord(v, idx, fallbackType)
      )
      return {
        hasVariants: true,
        variantType: fallbackType,
        variants: normalized,
      }
    }

    return {
      hasVariants: false,
      variantType: fallbackType,
      variants: [],
    }
  }

  async function syncProductVariantsToDb(
    productId: string,
    hasVariants: boolean,
    variantType: VariantType,
    variants: ProductVariantRecord[]
  ): Promise<void> {
    if (!db.productVariant) return
    try {
      if (!hasVariants || variants.length === 0) {
        if (typeof db.productVariant.deleteMany === "function") {
          await db.productVariant.deleteMany({ where: { productId } })
        }
        return
      }

      const incomingIds = variants.map((v) => v.id).filter(Boolean)
      if (typeof db.productVariant.deleteMany === "function") {
        await db.productVariant.deleteMany({
          where: {
            productId,
            id: { notIn: incomingIds },
          },
        })
      }

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        const dataPayload = {
          productId,
          size: v.size,
          variantType: v.variantType || variantType,
          price: v.price,
          comparePrice: v.comparePrice ?? null,
          weight: v.weight ?? null,
          sku: v.sku || null,
          inventoryQty: v.inventoryQty,
          isActive: Boolean(v.isActive),
          sortOrder: i,
        }

        if (typeof db.productVariant.upsert === "function") {
          await db.productVariant.upsert({
            where: { id: v.id },
            update: dataPayload,
            create: { id: v.id, ...dataPayload },
          })
        } else if (typeof db.productVariant.create === "function") {
          await db.productVariant.create({
            data: { id: v.id, ...dataPayload },
          })
        }
      }
    } catch (err) {
      console.warn("[AdminProductService] ProductVariant table sync fallback:", err)
    }
  }

  async function collectExternalSkus(
    excludeProductId: string | null,
    metaStore: CatalogMetadataStore
  ): Promise<Set<string>> {
    const skus = new Set<string>()
    for (const [prodId, meta] of Object.entries(metaStore.products || {})) {
      if (excludeProductId && prodId === excludeProductId) continue
      if (meta?.sku && meta.sku.trim()) {
        skus.add(meta.sku.trim().toLowerCase())
      }
      if (meta?.variantSkus && typeof meta.variantSkus === "object") {
        for (const vSku of Object.values(meta.variantSkus)) {
          if (vSku && String(vSku).trim()) {
            skus.add(String(vSku).trim().toLowerCase())
          }
        }
      }
      if (Array.isArray(meta?.variants)) {
        for (const v of meta.variants) {
          if (v?.sku && String(v.sku).trim()) {
            skus.add(String(v.sku).trim().toLowerCase())
          }
        }
      }
    }

    if (db.productVariant && typeof db.productVariant.findMany === "function") {
      try {
        const dbVars = await db.productVariant.findMany({
          where: excludeProductId ? { productId: { not: excludeProductId } } : undefined,
        })
        if (Array.isArray(dbVars)) {
          for (const v of dbVars) {
            if (v?.sku && String(v.sku).trim()) {
              skus.add(String(v.sku).trim().toLowerCase())
            }
          }
        }
      } catch {
        // Ignore if table not migrated yet
      }
    }

    return skus
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

    const { hasVariants, variantType, variants } = await getProductVariants(p.id, store)

    let effectiveStock = p.inventoryQty
    let effectivePrice = p.price
    let effectiveComparePrice = p.comparePrice ?? null
    let effectiveWeight = p.weight ?? null

    if (hasVariants && variants.length > 0) {
      const agg = computeAggregateProductStateFromVariants(variants)
      effectiveStock = agg.inventoryQty
      effectivePrice = agg.price
      effectiveComparePrice = agg.comparePrice
      effectiveWeight = agg.weight ?? p.weight ?? null
    }

    const stockDisplay = getAdminStockDisplay(effectiveStock, threshold)
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
      price: effectivePrice,
      comparePrice: effectiveComparePrice,
      currency: p.currency || "USD",
      metalType: p.metalType || "Yellow Gold",
      metalColor: prodMeta.metalColor || p.metalType || "Yellow Gold",
      karat: p.karat || "",
      material: prodMeta.material || p.karat || "",
      stoneType: p.stoneType || "none",
      weight: effectiveWeight,
      length: p.length ?? null,
      sizes: sizesList,
      lengths: lengthsList,
      variations: variationsList,
      hasVariants,
      variantType,
      variants,
      images: imagesList,
      image: imagesList[0] || "/placeholder.svg",
      isActive: Boolean(p.isActive),
      isFeatured: Boolean(p.isFeatured),
      isBestSeller: Boolean(p.isBestSeller),
      status: p.isActive ? "Active" : "Inactive",
      stock: effectiveStock,
      stockMode: getStockMode(effectiveStock),
      isUnlimited: isUnlimitedStock(effectiveStock),
      stockDisplay,
      lowStockThreshold: threshold,
    }
  }

  async function createProduct(input: CreateProductInput) {
    const name = String(input.name || "").trim()
    if (!name) {
      throw new Error("Product name is required.")
    }

    const description = String(input.description || "").trim()
    if (!description) {
      throw new Error("Product description is required.")
    }

    const category = normalizeCategory(input.category)
    const imagesList = parseImagesList(
      Array.isArray(input.images) ? JSON.stringify(input.images) : input.images
    )
    if (imagesList.length === 0) {
      throw new Error("At least one product image is required.")
    }

    const baseSlug =
      (input.slug ? String(input.slug).trim() : "") ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      `product-${Date.now()}`

    const existingSlug =
      db.product && typeof db.product.findUnique === "function"
        ? await db.product.findUnique({ where: { slug: baseSlug } })
        : null
    const finalSlug = existingSlug ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug

    const metaStore = await getCatalogMetadata()
    const externalSkus = await collectExternalSkus(null, metaStore)

    const hasVariants = Boolean(input.hasVariants)
    const variantType = normalizeVariantType(input.variantType)
    let normalizedVariants: ProductVariantRecord[] = []
    let price: number
    let comparePrice: number | null = null
    let weight: number | null = null
    let length = parseOptionalPositiveFloat(input.length, "Product length", false)
    let inventoryQty: number
    let sizesList: string[] = []
    let variantSkusMap: Record<string, string> = {}

    if (hasVariants) {
      normalizedVariants = validateAndNormalizeVariants(input.variants, variantType, {
        slug: finalSlug,
        existingExternalSkus: externalSkus,
      })
      const agg = computeAggregateProductStateFromVariants(normalizedVariants)
      price = agg.price
      comparePrice = agg.comparePrice
      weight = agg.weight
      inventoryQty = agg.inventoryQty
      sizesList = agg.sizes
      variantSkusMap = agg.variantSkus
    } else {
      const parsedPrice = parseOptionalPositiveFloat(input.price, "Selling price", false)
      if (parsedPrice === null || parsedPrice <= 0) {
        throw new Error("Selling price must be greater than $0.00 USD.")
      }
      price = parsedPrice
      comparePrice = parseOptionalPositiveFloat(input.comparePrice, "Compare price", true)
      weight = parseOptionalPositiveFloat(input.weight, "Product weight", false)
      inventoryQty = normalizeInventoryInput(input.stockMode || "limited", input.inventoryQty ?? 1)
      sizesList = parseStringList(input.sizes)
      variantSkusMap = normalizeVariantSkusMap(input.variantSkus, finalSlug)
    }

    const materialStr = String(input.material ?? input.karat ?? "").trim()
    const metalColorStr = String(
      input.metalColor ?? input.metalType ?? "Yellow Gold"
    ).trim()
    const stoneTypeStr = String(input.stoneType ?? "none").trim() || "none"
    const isActive = input.isActive !== undefined ? Boolean(input.isActive) : true
    const isFeatured = Boolean(input.isFeatured)
    const isBestSeller = Boolean(input.isBestSeller)

    const cleanSku = resolveRealProductSku(input.sku, finalSlug) || undefined
    if (cleanSku && externalSkus.has(cleanSku.toLowerCase())) {
      throw new Error(`SKU "${cleanSku}" is already assigned to another product.`)
    }

    const createdProduct = await db.product.create({
      data: {
        name,
        nameEs: input.nameEs ? String(input.nameEs).trim() || null : null,
        slug: finalSlug,
        description,
        descriptionEs: input.descriptionEs ? String(input.descriptionEs).trim() || null : null,
        price,
        comparePrice,
        metalType: metalColorStr || "Yellow Gold",
        karat: materialStr || null,
        stoneType: stoneTypeStr,
        category,
        images: JSON.stringify(imagesList),
        isActive,
        isFeatured,
        isBestSeller,
        inventoryQty,
        weight,
        length,
        sizes: sizesList.length > 0 ? JSON.stringify(sizesList) : null,
      },
    })

    const variantsWithProdId = normalizedVariants.map((v) => ({
      ...v,
      productId: createdProduct.id,
    }))

    await syncProductVariantsToDb(createdProduct.id, hasVariants, variantType, variantsWithProdId)

    metaStore.products[createdProduct.id] = {
      sku: cleanSku,
      variantSkus: Object.keys(variantSkusMap).length > 0 ? variantSkusMap : undefined,
      material: materialStr || undefined,
      metalColor: metalColorStr || undefined,
      lengths: parseStringList(input.lengths),
      variations: parseStringList(input.variations),
      hasVariants,
      variantType: hasVariants ? variantType : undefined,
      variants: hasVariants ? variantsWithProdId : undefined,
    }
    await saveCatalogMetadata(metaStore)

    const formatted = await formatProductForAdmin(createdProduct, metaStore)
    return {
      success: true,
      product: formatted,
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

    const category = normalizeCategory(input.category || existing.category)

    const imagesList = parseImagesList(
      Array.isArray(input.images) ? JSON.stringify(input.images) : input.images
    )
    if (imagesList.length === 0) {
      throw new Error("At least one product image is required.")
    }

    const metaStore = await getCatalogMetadata()
    const currentMeta = metaStore.products[existing.id] || {}
    const externalSkus = await collectExternalSkus(existing.id, metaStore)

    const hasVariants =
      input.hasVariants !== undefined
        ? Boolean(input.hasVariants)
        : Boolean(currentMeta.hasVariants && input.variants !== undefined)

    const variantType = normalizeVariantType(input.variantType ?? currentMeta.variantType)
    const length = parseOptionalPositiveFloat(input.length, "Product length", false)
    const lengthsList = parseStringList(input.lengths)
    const variationsList = parseStringList(input.variations)

    let normalizedVariants: ProductVariantRecord[] = []
    let price: number
    let comparePrice: number | null = null
    let weight: number | null = null
    let inventoryQty: number
    let sizesList: string[] = []
    let cleanVariantSkus: Record<string, string> = {}

    if (hasVariants) {
      const variantsToValidate =
        input.variants !== undefined ? input.variants : currentMeta.variants || []
      normalizedVariants = validateAndNormalizeVariants(variantsToValidate, variantType, {
        slug: existing.slug,
        existingExternalSkus: externalSkus,
      }).map((v) => ({
        ...v,
        productId: existing.id,
      }))

      const agg = computeAggregateProductStateFromVariants(normalizedVariants)
      price = agg.price
      comparePrice = agg.comparePrice
      weight = agg.weight
      inventoryQty = agg.inventoryQty
      sizesList = agg.sizes
      cleanVariantSkus = agg.variantSkus
    } else {
      const parsedPrice = parseOptionalPositiveFloat(input.price, "Selling price", false)
      if (parsedPrice === null || parsedPrice <= 0) {
        throw new Error("Selling price must be greater than $0.00 USD.")
      }
      price = parsedPrice
      comparePrice = parseOptionalPositiveFloat(input.comparePrice, "Compare price", true)
      weight = parseOptionalPositiveFloat(input.weight, "Product weight", false)
      inventoryQty = normalizeInventoryInput(input.stockMode || "limited", input.inventoryQty)
      sizesList = parseStringList(input.sizes)
      const rawVariantSkus =
        input.variantSkus !== undefined ? input.variantSkus : currentMeta.variantSkus
      cleanVariantSkus = normalizeVariantSkusMap(rawVariantSkus, existing.slug)
    }

    const materialStr = String(input.material ?? input.karat ?? existing.karat ?? "").trim()
    const metalColorStr = String(
      input.metalColor ?? input.metalType ?? existing.metalType ?? "Yellow Gold"
    ).trim()
    const stoneTypeStr = String(input.stoneType ?? existing.stoneType ?? "none").trim() || "none"

    const isActive =
      input.isActive !== undefined ? Boolean(input.isActive) : Boolean(existing.isActive)
    const isFeatured =
      input.isFeatured !== undefined ? Boolean(input.isFeatured) : Boolean(existing.isFeatured)
    const isBestSeller =
      input.isBestSeller !== undefined
        ? Boolean(input.isBestSeller)
        : Boolean(existing.isBestSeller)

    const rawSku = input.sku !== undefined ? input.sku : currentMeta.sku
    const cleanSku = resolveRealProductSku(rawSku, existing.slug) || undefined
    if (cleanSku && externalSkus.has(cleanSku.toLowerCase())) {
      throw new Error(`SKU "${cleanSku}" is already assigned to another product.`)
    }

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

    await syncProductVariantsToDb(existing.id, hasVariants, variantType, normalizedVariants)

    const updatedMeta: ProductExtendedMeta = {
      ...currentMeta,
      sku: cleanSku,
      variantSkus: Object.keys(cleanVariantSkus).length > 0 ? cleanVariantSkus : undefined,
      material: materialStr || undefined,
      metalColor: metalColorStr || undefined,
      lengths: lengthsList,
      variations: variationsList,
      hasVariants,
      variantType: hasVariants ? variantType : undefined,
      variants: hasVariants ? normalizedVariants : undefined,
    }

    if (
      input.lowStockThreshold !== undefined &&
      input.lowStockThreshold !== null &&
      String(input.lowStockThreshold).trim() !== ""
    ) {
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

    const metaStore = await getCatalogMetadata()
    const currentVariantState = await getProductVariants(existing.id, metaStore)

    let finalInventoryQty: number

    // If product has variants and variantStocks were provided, update each variant's stock independently
    if (
      currentVariantState.hasVariants &&
      Array.isArray(input.variantStocks) &&
      input.variantStocks.length > 0
    ) {
      const updateMap = new Map(input.variantStocks.map((vs) => [vs.id, vs]))
      const updatedVariants = currentVariantState.variants.map((v) => {
        const match = updateMap.get(v.id)
        if (!match) return v
        const nextQty = normalizeInventoryInput(match.stockMode, match.quantity)
        const nextUnlim = isUnlimitedStock(nextQty)
        return {
          ...v,
          inventoryQty: nextQty,
          stockMode: nextUnlim ? ("unlimited" as const) : ("limited" as const),
          isUnlimited: nextUnlim,
          isActive: match.isActive !== undefined ? Boolean(match.isActive) : v.isActive,
        }
      })

      const agg = computeAggregateProductStateFromVariants(updatedVariants)
      finalInventoryQty = agg.inventoryQty

      await syncProductVariantsToDb(
        existing.id,
        true,
        currentVariantState.variantType,
        updatedVariants
      )

      metaStore.products[existing.id] = {
        ...(metaStore.products[existing.id] || {}),
        hasVariants: true,
        variantType: currentVariantState.variantType,
        variants: updatedVariants,
      }
    } else {
      const mode = String(input.stockMode || "limited").toLowerCase().trim() as StockMode
      if (mode === "unlimited") {
        finalInventoryQty = normalizeInventoryInput("unlimited")
      } else if (input.adjustDelta !== undefined && input.quantity === undefined) {
        finalInventoryQty = adjustLimitedStock(existing.inventoryQty, input.adjustDelta)
      } else {
        finalInventoryQty = normalizeInventoryInput("limited", input.quantity)
      }
    }

    const updatedProduct = await db.product.update({
      where: { id: existing.id },
      data: {
        inventoryQty: finalInventoryQty,
      },
    })

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
    }

    await saveCatalogMetadata(metaStore)

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
    getProductVariants,
    syncProductVariantsToDb,
    formatProductForAdmin,
    createProduct,
    updateProduct,
    updateInventory,
    setProductStatus,
    setGlobalLowStockThreshold,
  }
}
