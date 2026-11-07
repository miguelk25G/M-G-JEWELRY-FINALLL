/**
 * Helper utilities for cart size reconciliation and recovery against catalog rules.
 */

export interface CartItemLike {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  size?: string
}

export interface CatalogProductMeta {
  id: string
  name?: string
  slug?: string
  sizes?: string | null
  isActive?: boolean
}

/**
 * Safely parses sizes configuration from a catalog product.
 */
export function getProductAvailableSizes(product?: CatalogProductMeta | null): string[] {
  if (!product || !product.sizes) return []
  try {
    const parsed = JSON.parse(product.sizes)
    return Array.isArray(parsed) ? parsed.map(String).map((s) => s.trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

/**
 * Returns whether a product admits selectable sizes in the catalog.
 */
export function productAdmitsSizes(product?: CatalogProductMeta | null): boolean {
  return getProductAvailableSizes(product).length > 0
}

/**
 * Checks a cart line against its catalog definition.
 * Returns true if the product has no selectable sizes in the catalog, but the cart line has a size.
 */
export function isLineIncompatibleNoSizes(
  item: CartItemLike,
  catalogProduct?: CatalogProductMeta | null
): boolean {
  if (!item.size || !catalogProduct) return false
  const admits = productAdmitsSizes(catalogProduct)
  return !admits && Boolean(item.size)
}

/**
 * Recovers a cart by modifying EXCLUSIVELY the line(s) confirmed by the catalog
 * to belong to a product that does not admit sizes.
 *
 * Strictly preserves:
 * 1. Sizes of all products that admit sizes.
 * 2. Quantities of all lines.
 * 3. Distinct cart line IDs.
 */
export function recoverCartItemsExclusively(
  items: CartItemLike[],
  catalogProducts: CatalogProductMeta[],
  targetCartItemId?: string
): {
  updatedItems: CartItemLike[]
  modifiedItemIds: string[]
  recoveredCount: number
} {
  const productMap = new Map(catalogProducts.map((p) => [p.id, p]))
  const modifiedItemIds: string[] = []

  const updatedItems = items.map((item) => {
    // If a specific target cart item ID is specified, only evaluate that exact line
    if (targetCartItemId && item.id !== targetCartItemId) {
      return { ...item }
    }

    const catalogProduct = productMap.get(item.productId)
    if (isLineIncompatibleNoSizes(item, catalogProduct)) {
      modifiedItemIds.push(item.id)
      return {
        ...item,
        size: undefined,
      }
    }

    // Preserve the item completely intact
    return { ...item }
  })

  return {
    updatedItems,
    modifiedItemIds,
    recoveredCount: modifiedItemIds.length,
  }
}
