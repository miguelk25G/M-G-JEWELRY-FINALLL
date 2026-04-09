'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingBag, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFavoritesStore } from '@/lib/store/favorites-store'
import { useCartStore } from '@/lib/store/cart-store'
import { useTranslation } from '@/i18n/locale-context'
import { formatPrice } from '@/lib/format'
import { toast } from 'sonner'

export function FavoritesContent() {
  const { t } = useTranslation()
  const { items, removeItem } = useFavoritesStore()
  const addToCart = useCartStore((state) => state.addItem)

  const handleAddToCart = (item: typeof items[0]) => {
    addToCart({
      productId: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
    })
    toast.success(t('product.addedToCart'))
  }

  if (items.length === 0) {
    return (
      <div className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
              <Heart className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="mt-6 font-serif text-2xl font-bold text-foreground">
              {t('favorites.empty')}
            </h1>
            <p className="mt-2 text-muted-foreground">{t('favorites.emptyMessage')}</p>
            <Button className="mt-6 gap-2" asChild>
              <Link href="/collections">
                Browse Collections
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground lg:text-4xl">
              {t('favorites.title')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-lg border border-border bg-card p-4 sm:gap-6 sm:p-6"
            >
              <Link
                href={`/product/${item.slug}`}
                className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-32 sm:w-32"
              >
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/product/${item.slug}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove from favorites</span>
                  </Button>
                </div>
                <div className="mt-auto flex items-center gap-3 pt-4">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleAddToCart(item)}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {t('product.addToCart')}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/product/${item.slug}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
