import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FavoriteItem {
  id: string
  name: string
  price: number
  image: string
  slug: string
}

interface FavoritesStore {
  items: FavoriteItem[]
  
  // Actions
  addItem: (item: FavoriteItem) => void
  removeItem: (id: string) => void
  toggleItem: (item: FavoriteItem) => void
  clearFavorites: () => void
  
  // Computed
  isFavorite: (id: string) => boolean
  itemCount: () => number
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items
        if (!items.find((i) => i.id === item.id)) {
          set({ items: [...items, item] })
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      toggleItem: (item) => {
        const items = get().items
        if (items.find((i) => i.id === item.id)) {
          set({ items: items.filter((i) => i.id !== item.id) })
        } else {
          set({ items: [...items, item] })
        }
      },

      clearFavorites: () => {
        set({ items: [] })
      },

      isFavorite: (id) => get().items.some((i) => i.id === id),
      itemCount: () => get().items.length,
    }),
    {
      name: 'mg-favorites',
    }
  )
)
