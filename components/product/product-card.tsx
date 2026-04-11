'use client'

import React from "react"

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useFavoritesStore } from '@/lib/store/favorites-store'
import { useCartStore } from '@/lib/store/cart-store'
import { useTranslation } from '@/i18n/locale-context'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: {
    id: string
    name: string
    nameEs?: string | null
    slug: string
    price: number
    comparePrice?: number | null
    images: string
    category: string
    metalType: string
    karat?: string | null
    stoneType: string
    isBestSeller?: boolean
    inventoryQty: number
  }
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { t, locale } = useTranslation()
  const { toggleItem, isFavorite } = useFavoritesStore()
  const addToCart = useCartStore((state) => state.addItem)

  const images = JSON.parse(product.images) as string[]
  const mainImage = images[0] || '/placeholder.svg'
  const displayName = locale === 'es' && product.nameEs ? product.nameEs : product.name
  const isOnSale = product.comparePrice && product.comparePrice > product.price
  const isLowStock = product.inventoryQty > 0 && product.inventoryQty <= 3
  const isOutOfStock = product.inventoryQty === 0
  const favorite = isFavorite(product.id)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleItem({
      id: product.id,
      name: displayName,
      price: product.price,
      image: mainImage,
      slug: product.slug,
    })
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isOutOfStock) {
      addToCart({
        productId: product.id,
        name: displayName,
        price: product.price,
        image: mainImage,
        quantity: 1,
        metalType: product.metalType,
        karat: product.karat || undefined,
      })
    }
  }

  return (
    <div className={cn('group relative', className)}>
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
          <Image
            src={mainImage || "/placeholder.svg"}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          
          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {isOnSale && (
              <Badge variant="destructive" className="text-xs">
                {locale === 'es' ? 'Oferta' : 'Sale'}
              </Badge>
            )}
            {product.isBestSeller && (
              <Badge variant="secondary" className="text-xs">
                {locale === 'es' ? 'Más Vendido' : 'Best Seller'}
              </Badge>
            )}
            {isLowStock && (
              <Badge variant="outline" className="border-amber-500 bg-amber-500/10 text-amber-600 text-xs">
                {t('product.lowStock', { count: product.inventoryQty })}
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              'absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100',
              favorite && 'opacity-100'
            )}
            onClick={handleFavoriteClick}
          >
            <Heart
              className={cn('h-4 w-4', favorite && 'fill-red-500 text-red-500')}
            />
            <span className="sr-only">
              {favorite ? 'Remove from favorites' : 'Add to favorites'}
            </span>
          </Button>

          {/* Quick Add Button */}
          {!isOutOfStock && (
            <div className="absolute bottom-2 left-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={handleQuickAdd}
              >
                <ShoppingBag className="h-4 w-4" />
                {t('product.addToCart')}
              </Button>
            </div>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <span className="text-sm font-medium text-muted-foreground">
                {t('product.outOfStock')}
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-medium text-foreground line-clamp-2">
            {displayName}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {formatPrice(product.price)}
            </span>
            {isOnSale && product.comparePrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {product.karat} {product.metalType}
            {product.stoneType !== 'none' && ` • ${product.stoneType} ${locale === 'es' ? 'diamante' : 'diamond'}`}
          </p>
        </div>
      </Link>
    </div>
  )
}
