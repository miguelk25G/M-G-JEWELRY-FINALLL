import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  productId: string
  variantId?: string
  name: string
  price: number
  comparePrice?: number
  image: string
  quantity: number
  size?: string
  variantType?: string
  sku?: string
  weight?: number | null
  metalType?: string
  karat?: string
  maxStock?: number
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  
  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateItemSize: (
    id: string,
    size?: string,
    variantPatch?: {
      variantId?: string
      price?: number
      sku?: string
      weight?: number | null
      maxStock?: number
    }
  ) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  
  // Computed
  itemCount: () => number
  subtotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const items = get().items
        const existingItem = items.find(
          (i) =>
            i.productId === item.productId &&
            (i.variantId || '') === (item.variantId || '') &&
            (i.size || '') === (item.size || '')
        )

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.id === existingItem.id
                ? {
                    ...i,
                    price: item.price,
                    comparePrice: item.comparePrice,
                    image: item.image,
                    sku: item.sku ?? i.sku,
                    weight: item.weight !== undefined ? item.weight : i.weight,
                    variantType: item.variantType ?? i.variantType,
                    maxStock: item.maxStock,
                    quantity:
                      typeof item.maxStock === 'number' && item.maxStock >= 0
                        ? Math.min(item.maxStock, i.quantity + item.quantity)
                        : i.quantity + item.quantity,
                  }
                : i
            ),
          })
        } else {
          set({
            items: [
              ...items,
              {
                ...item,
                id: `${item.productId}-${item.variantId || item.size || 'default'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              },
            ],
          })
        }
        
        // Open cart drawer when item is added
        set({ isOpen: true })
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id)
          return
        }
        set({
          items: get().items.map((i) => {
            if (i.id !== id) return i
            const capped =
              typeof i.maxStock === 'number' && i.maxStock >= 0
                ? Math.min(i.maxStock, quantity)
                : quantity
            return { ...i, quantity: capped }
          }),
        })
      },

      updateItemSize: (id, size, variantPatch) => {
        const currentItems = get().items
        const target = currentItems.find((i) => i.id === id)
        if (!target) return
        const cleanSize = size ? size.trim() : undefined
        const nextVariantId = variantPatch?.variantId !== undefined ? variantPatch.variantId : target.variantId

        // If another line item for the same product already has the same variantId + cleanSize, merge them
        const existingSame = currentItems.find(
          (i) =>
            i.id !== id &&
            i.productId === target.productId &&
            (i.variantId || '') === (nextVariantId || '') &&
            (i.size || '') === (cleanSize || '')
        )

        if (existingSame) {
          set({
            items: currentItems
              .filter((i) => i.id !== id)
              .map((i) =>
                i.id === existingSame.id
                  ? { ...i, quantity: i.quantity + target.quantity }
                  : i
              ),
          })
        } else {
          set({
            items: currentItems.map((i) =>
              i.id === id
                ? {
                    ...i,
                    size: cleanSize,
                    ...(variantPatch
                      ? {
                          variantId: variantPatch.variantId,
                          price: variantPatch.price ?? i.price,
                          sku: variantPatch.sku ?? i.sku,
                          weight: variantPatch.weight !== undefined ? variantPatch.weight : i.weight,
                          maxStock: variantPatch.maxStock,
                        }
                      : {}),
                  }
                : i
            ),
          })
        }
      },

      clearCart: () => {
        set({ items: [] })
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: 'mg-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
