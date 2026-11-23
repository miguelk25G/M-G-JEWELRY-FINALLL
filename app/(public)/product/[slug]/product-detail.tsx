'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingBag, Minus, Plus, MessageCircle, ShieldCheck, Truck, RotateCcw, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductCard } from '@/components/product/product-card'
import { useCartStore } from '@/lib/store/cart-store'
import { useFavoritesStore } from '@/lib/store/favorites-store'
import { useTranslation } from '@/i18n/locale-context'
import { formatPrice } from '@/lib/format'
import {
  type ProductVariantRecord,
  type VariantType,
  getStorefrontStockState,
  getVariantTypeOption,
  parseVariantOptionAndSku,
  resolveActiveProductSku,
  resolveRealProductSku,
} from '@/lib/inventory'
import type { ProductShowcaseBadge } from '@/lib/best-sellers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  nameEs: string | null
  slug: string
  sku?: string | null
  variantSkus?: Record<string, string> | null
  description: string
  descriptionEs: string | null
  price: number
  comparePrice: number | null
  currency: string
  metalType: string
  karat: string | null
  stoneType: string
  category: string
  images: string
  isFeatured: boolean
  isBestSeller: boolean
  showcaseBadge?: ProductShowcaseBadge
  inventoryQty: number
  lowStockThreshold?: number
  weight?: number | null
  length?: number | null
  lengths?: string[]
  variations?: string[]
  sizes: string | null
  hasVariants?: boolean
  variantType?: VariantType
  variants?: ProductVariantRecord[]
}

interface RelatedProduct {
  id: string
  name: string
  nameEs: string | null
  slug: string
  price: number
  comparePrice: number | null
  images: string
  category: string
  metalType: string
  karat: string | null
  stoneType: string
  isBestSeller: boolean
  showcaseBadge?: ProductShowcaseBadge
  inventoryQty: number
}

interface ProductDetailProps {
  product: Product
  relatedProducts: RelatedProduct[]
}

export function ProductDetail({ product, relatedProducts }: ProductDetailProps) {
  const { t, locale } = useTranslation()
  const addToCart = useCartStore((state) => state.addItem)
  const cartItems = useCartStore((state) => state.items)
  const { toggleItem, isFavorite } = useFavoritesStore()

  const images = (() => {
    try {
      const parsed = JSON.parse(product.images)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['/placeholder.svg']
    } catch {
      return product.images ? [product.images] : ['/placeholder.svg']
    }
  })()

  // Active structured variants (when product has multiple sizes/lengths with individual pricing)
  const activeVariants: ProductVariantRecord[] =
    product.hasVariants && Array.isArray(product.variants)
      ? product.variants.filter((v) => v && v.isActive !== false)
      : []
  const hasStructuredVariants = Boolean(product.hasVariants && activeVariants.length > 0)
  const variantTypeMeta = getVariantTypeOption(product.variantType)

  // Safely parse legacy available sizes (for products without structured variants)
  const availableSizes: string[] = (() => {
    if (hasStructuredVariants) return []
    if (!product.sizes) return []
    try {
      const parsed = JSON.parse(product.sizes)
      return Array.isArray(parsed) ? parsed.map((s) => String(s).trim()).filter(Boolean) : []
    } catch {
      return []
    }
  })()

  const hasSizes = !hasStructuredVariants && availableSizes.length > 0
  const availableLengths: string[] =
    !hasStructuredVariants && Array.isArray(product.lengths)
      ? product.lengths.map((l) => String(l).trim()).filter(Boolean)
      : []
  const availableVariations: string[] = Array.isArray(product.variations)
    ? product.variations.map((v) => String(v).trim()).filter(Boolean)
    : []

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedLength, setSelectedLength] = useState<string | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const selectedVariant: ProductVariantRecord | null = hasStructuredVariants
    ? activeVariants.find((v) => v.id === selectedVariantId) || null
    : null

  // Lead variant (lowest priced active variant) for initial display before customer selects one
  const leadVariant: ProductVariantRecord | null = hasStructuredVariants
    ? [...activeVariants].sort((a, b) => a.price - b.price)[0] || null
    : null

  // Dynamic Price & Compare-at Price
  const activePrice = hasStructuredVariants
    ? selectedVariant
      ? selectedVariant.price
      : leadVariant?.price ?? product.price
    : product.price

  const activeComparePrice = hasStructuredVariants
    ? selectedVariant
      ? selectedVariant.comparePrice
      : leadVariant?.comparePrice ?? null
    : product.comparePrice

  const isOnSale = Boolean(activeComparePrice && activeComparePrice > activePrice)

  // Dynamic Weight (never falls back to inaccurate parent weight when variants are enabled)
  const activeWeight: number | null = hasStructuredVariants
    ? selectedVariant
      ? selectedVariant.weight
      : null
    : product.weight ?? null

  // Dynamic SKU
  const activeSku = (() => {
    if (hasStructuredVariants && selectedVariant) {
      const varSku = resolveRealProductSku(selectedVariant.sku, product.slug)
      if (varSku) return varSku
    }
    return resolveActiveProductSku({
      baseSku: product.sku,
      slug: product.slug,
      variantSkus: product.variantSkus,
      selection: {
        variantId: selectedVariant?.id,
        size: selectedVariant?.size || selectedSize,
        length: selectedLength,
        variation: selectedVariation,
      },
    })
  })()

  const displayName = locale === 'es' && product.nameEs ? product.nameEs : product.name
  const displayDescription = locale === 'es' && product.descriptionEs ? product.descriptionEs : product.description

  // Dynamic Stock State per selected variant (or overall product if no variant selected yet)
  const stockState = hasStructuredVariants
    ? selectedVariant
      ? getStorefrontStockState(selectedVariant.inventoryQty, product.lowStockThreshold)
      : getStorefrontStockState(product.inventoryQty, product.lowStockThreshold)
    : getStorefrontStockState(product.inventoryQty, product.lowStockThreshold)

  const { isUnlimited, isLowStock, isOutOfStock, maxPurchasableQty } = stockState
  const favorite = isFavorite(product.id)

  // Track existing cart quantity independently per variant when variants are enabled
  const existingInCart = cartItems
    .filter((i) => {
      if (i.productId !== product.id) return false
      if (hasStructuredVariants) {
        return selectedVariant ? i.variantId === selectedVariant.id : false
      }
      return true
    })
    .reduce((sum, i) => sum + i.quantity, 0)

  const handleSelectVariant = (variant: ProductVariantRecord) => {
    setSelectedVariantId(variant.id)
    setSelectedSize(variant.size)
    const vStock = getStorefrontStockState(variant.inventoryQty, product.lowStockThreshold)
    if (!vStock.isUnlimited && vStock.maxPurchasableQty !== null && vStock.maxPurchasableQty > 0) {
      setQuantity((q) => Math.min(q, vStock.maxPurchasableQty!))
    } else {
      setQuantity(1)
    }
  }

  const handleAddToCart = () => {
    if (hasStructuredVariants) {
      if (!selectedVariant) {
        const promptMsg =
          locale === 'es'
            ? variantTypeMeta.selectorLabelEs
            : variantTypeMeta.selectorLabelEn
        toast.error(
          locale === 'es'
            ? `Por favor selecciona una opción (${promptMsg.toLowerCase()}) antes de agregar al carrito.`
            : `Please select an available option (${promptMsg.toLowerCase()}) before adding to cart.`
        )
        return
      }
      if (isOutOfStock) {
        toast.error(locale === 'es' ? 'Esta variante está agotada' : 'This variant is out of stock')
        return
      }
    } else {
      if (isOutOfStock) {
        toast.error(locale === 'es' ? 'Este producto está agotado' : 'This product is out of stock')
        return
      }
      if (hasSizes && !selectedSize) {
        toast.error(locale === 'es' ? 'Por favor selecciona una talla' : 'Please select a size')
        return
      }
      if (hasSizes && selectedSize && !availableSizes.includes(selectedSize)) {
        toast.error(locale === 'es' ? 'Por favor selecciona una talla disponible' : 'Please select an available size')
        return
      }
    }

    if (!isUnlimited && maxPurchasableQty !== null && existingInCart + quantity > maxPurchasableQty) {
      const remaining = Math.max(0, maxPurchasableQty - existingInCart)
      toast.error(
        locale === 'es'
          ? remaining === 0
            ? `Ya tienes el máximo disponible (${maxPurchasableQty}) en tu carrito.`
            : `Solo quedan ${maxPurchasableQty} unidades disponibles (${remaining} adicionales).`
          : remaining === 0
            ? `You already have the maximum available quantity (${maxPurchasableQty}) in your cart.`
            : `Only ${maxPurchasableQty} available in stock (${remaining} more can be added).`
      )
      return
    }

    if (hasStructuredVariants && selectedVariant) {
      addToCart({
        productId: product.id,
        variantId: selectedVariant.id,
        name: displayName,
        price: selectedVariant.price,
        comparePrice: selectedVariant.comparePrice ?? undefined,
        image: images[0],
        quantity,
        size: selectedVariant.size,
        variantType: product.variantType || selectedVariant.variantType,
        sku: activeSku || selectedVariant.sku || undefined,
        weight: selectedVariant.weight ?? undefined,
        metalType: product.metalType,
        karat: product.karat || undefined,
        maxStock: isUnlimited ? undefined : (maxPurchasableQty ?? undefined),
      })
    } else {
      addToCart({
        productId: product.id,
        name: displayName,
        price: product.price,
        comparePrice: product.comparePrice ?? undefined,
        image: images[0],
        quantity,
        size: hasSizes ? (selectedSize || undefined) : undefined,
        sku: activeSku || undefined,
        weight: product.weight ?? undefined,
        metalType: product.metalType,
        karat: product.karat || undefined,
        maxStock: isUnlimited ? undefined : (maxPurchasableQty ?? undefined),
      })
    }

    toast.success(t('product.addedToCart'))
  }

  const handleFavorite = () => {
    toggleItem({
      id: product.id,
      name: displayName,
      price: activePrice,
      image: images[0],
      slug: product.slug,
    })
  }

  const selectorHeading =
    locale === 'es' ? variantTypeMeta.selectorLabelEs : variantTypeMeta.selectorLabelEn
  const selectedPrefixLabel =
    locale === 'es' ? variantTypeMeta.selectedPrefixEs : variantTypeMeta.selectedPrefixEn

  return (
    <div className="py-8 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
              <Image
                src={images[selectedImage] || '/placeholder.svg'}
                alt={displayName}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute left-4 top-4 flex flex-col gap-1.5">
                {isOnSale && (
                  <Badge variant="destructive">
                    {locale === 'es' ? 'Oferta' : 'Sale'}
                  </Badge>
                )}
                {(product.showcaseBadge ?? (product.isBestSeller ? 'best_seller' : 'none')) ===
                  'best_seller' && (
                  <Badge variant="secondary">
                    {t('bestSellers.badgeBestSeller')}
                  </Badge>
                )}
                {product.showcaseBadge === 'mg_pick' && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/50 bg-background/90 text-amber-300 backdrop-blur-xs"
                  >
                    {t('bestSellers.badgeMgPick')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex flex-wrap gap-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'relative h-20 w-20 overflow-hidden rounded-lg bg-secondary transition-all',
                      selectedImage === index
                        ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                        : 'opacity-70 hover:opacity-100'
                    )}
                  >
                    <Image
                      src={image || '/placeholder.svg'}
                      alt={`${displayName} view ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Rating */}
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground lg:text-4xl">
                {displayName}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4',
                        star <= 4 ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">4.8 (24 reviews)</span>
              </div>
            </div>

            {/* Price & Compare-at Price */}
            <div className="flex items-baseline gap-3">
              <span
                data-testid="product-detail-price"
                className="text-3xl font-bold text-foreground"
              >
                {formatPrice(activePrice, product.currency)}
              </span>
              {isOnSale && activeComparePrice && (
                <span
                  data-testid="product-detail-compare-price"
                  className="text-xl text-muted-foreground line-through"
                >
                  {formatPrice(activeComparePrice, product.currency)}
                </span>
              )}
            </div>

            {/* Dynamic Summary: Availability & Weight */}
            <div className="flex flex-wrap items-center gap-3">
              <div data-testid="product-detail-availability">
                {isOutOfStock ? (
                  <Badge variant="outline" className="text-destructive border-destructive/40">
                    {t('product.outOfStock')}
                  </Badge>
                ) : isLowStock ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                    {t('product.lowStock', {
                      count:
                        hasStructuredVariants && selectedVariant
                          ? selectedVariant.inventoryQty
                          : product.inventoryQty,
                    })}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    {t('product.inStock')}
                  </Badge>
                )}
              </div>

              {activeWeight !== null && activeWeight > 0 && (
                <div
                  data-testid="product-detail-weight-badge"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-0.5 text-xs text-foreground"
                >
                  <span className="text-muted-foreground">{t('product.weight')}:</span>
                  <span className="font-semibold">{activeWeight} g</span>
                </div>
              )}

              {hasStructuredVariants && selectedVariant && activeWeight === null && (
                <span
                  data-testid="product-detail-weight-unavailable"
                  className="text-xs text-muted-foreground"
                >
                  {t('product.weightUnavailable')}
                </span>
              )}
            </div>

            <Separator />

            {/* Structured Product Variants Selector (Individual Price, Weight & Stock per Variant) */}
            {hasStructuredVariants && (
              <div className="space-y-3" data-testid="product-variant-selector">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    {selectedVariant ? (
                      <>
                        <span className="text-muted-foreground">{selectedPrefixLabel}: </span>
                        <span className="font-semibold text-foreground">{selectedVariant.size}</span>
                      </>
                    ) : (
                      <span>{selectorHeading}</span>
                    )}
                  </label>
                  {!selectedVariant && (
                    <span className="text-xs text-amber-500 font-medium">
                      {locale === 'es' ? 'Requerido' : 'Required'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {activeVariants.map((variant) => {
                    const vStock = getStorefrontStockState(
                      variant.inventoryQty,
                      product.lowStockThreshold
                    )
                    const vOut = vStock.isOutOfStock
                    const isSelected = selectedVariantId === variant.id

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        data-testid={`variant-option-${variant.size}`}
                        data-variant-id={variant.id}
                        data-out-of-stock={vOut ? 'true' : 'false'}
                        onClick={() => handleSelectVariant(variant)}
                        className={cn(
                          'group relative flex flex-col items-center justify-center rounded-lg border px-3 py-2.5 text-center transition-all',
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary shadow-xs'
                            : vOut
                            ? 'border-border/60 bg-secondary/20 text-muted-foreground opacity-65 hover:border-border'
                            : 'border-border bg-card/60 text-foreground hover:border-primary/60 hover:bg-secondary/40'
                        )}
                      >
                        <span
                          className={cn(
                            'text-sm font-semibold tracking-tight',
                            vOut && 'line-through decoration-muted-foreground/70'
                          )}
                        >
                          {variant.size}
                        </span>
                        <span className="mt-0.5 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                          {formatPrice(variant.price, product.currency)}
                        </span>
                        {vOut && (
                          <span className="mt-0.5 text-[10px] font-medium text-destructive">
                            {t('product.outOfStock')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Legacy Size Selection (Single-Price Products) */}
            {hasSizes && (
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  {t('product.size')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => {
                    const { label } = parseVariantOptionAndSku(size)
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          'flex h-10 min-w-12 px-3 items-center justify-center rounded-md border text-sm transition-colors',
                          selectedSize === size
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-transparent hover:border-foreground'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Legacy Length Variant Selection */}
            {availableLengths.length > 0 && (
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  {locale === 'es' ? 'Largo' : 'Length'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableLengths.map((lenOpt) => {
                    const { label } = parseVariantOptionAndSku(lenOpt)
                    return (
                      <button
                        key={lenOpt}
                        type="button"
                        onClick={() =>
                          setSelectedLength((prev) => (prev === lenOpt ? null : lenOpt))
                        }
                        className={cn(
                          'flex h-10 min-w-12 px-3 items-center justify-center rounded-md border text-sm transition-colors',
                          selectedLength === lenOpt
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-transparent hover:border-foreground'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Variation Selection */}
            {availableVariations.length > 0 && (
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  {locale === 'es' ? 'Variación' : 'Variation'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableVariations.map((varOpt) => {
                    const { label } = parseVariantOptionAndSku(varOpt)
                    return (
                      <button
                        key={varOpt}
                        type="button"
                        onClick={() =>
                          setSelectedVariation((prev) => (prev === varOpt ? null : varOpt))
                        }
                        className={cn(
                          'flex h-10 px-3 items-center justify-center rounded-md border text-sm transition-colors',
                          selectedVariation === varOpt
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-transparent hover:border-foreground'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="mb-3 block text-sm font-medium text-foreground">
                {t('cart.quantity')}
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={
                    isOutOfStock ||
                    (!isUnlimited && maxPurchasableQty !== null && quantity >= maxPurchasableQty)
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                data-testid="add-to-cart-button"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingBag className="h-5 w-5" />
                {isOutOfStock ? t('product.outOfStock') : t('product.addToCart')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={cn(favorite && 'text-red-500')}
                onClick={handleFavorite}
              >
                <Heart className={cn('h-5 w-5', favorite && 'fill-red-500')} />
              </Button>
            </div>

            {/* Ask White-Glove / Concierge */}
            <Button variant="secondary" className="w-full gap-2" asChild>
              <Link href={`/white-glove?product=${product.slug}`}>
                <MessageCircle className="h-4 w-4" />
                {t('product.askWhite-Glove') || t('product.askConcierge')}
              </Link>
            </Button>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex flex-col items-center text-center">
                <ShieldCheck className="h-6 w-6 text-foreground" />
                <span className="mt-2 text-xs text-muted-foreground">{t('trust.authenticity')}</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <Truck className="h-6 w-6 text-foreground" />
                <span className="mt-2 text-xs text-muted-foreground">{t('trust.shipping')}</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <RotateCcw className="h-6 w-6 text-foreground" />
                <span className="mt-2 text-xs text-muted-foreground">{t('trust.returns')}</span>
              </div>
            </div>

            {/* Specifications */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 font-medium text-foreground">{t('product.specifications')}</h3>
              <dl className="grid grid-cols-[minmax(110px,auto)_minmax(0,1fr)] sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {activeSku && (
                  <>
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd
                      data-testid="product-detail-sku"
                      className="min-w-0 text-foreground font-mono text-xs sm:text-sm leading-relaxed break-words [overflow-wrap:anywhere] whitespace-normal"
                    >
                      {activeSku}
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">{t('product.metal')}</dt>
                <dd className="min-w-0 text-foreground capitalize break-words">{product.metalType}</dd>
                {product.karat && (
                  <>
                    <dt className="text-muted-foreground">{t('product.karat')}</dt>
                    <dd className="min-w-0 text-foreground uppercase break-words">{product.karat}</dd>
                  </>
                )}
                {product.stoneType && product.stoneType !== 'none' && (
                  <>
                    <dt className="text-muted-foreground">{t('product.stone')}</dt>
                    <dd className="min-w-0 text-foreground capitalize break-words">{product.stoneType} Diamond</dd>
                  </>
                )}
                {hasStructuredVariants ? (
                  <>
                    <dt className="text-muted-foreground">{selectedPrefixLabel}</dt>
                    <dd
                      data-testid="product-detail-selected-size"
                      className="min-w-0 text-foreground break-words"
                    >
                      {selectedVariant
                        ? selectedVariant.size
                        : activeVariants.map((v) => v.size).join(', ')}
                    </dd>
                    {activeWeight !== null && activeWeight > 0 && (
                      <>
                        <dt className="text-muted-foreground">{t('product.weight')}</dt>
                        <dd
                          data-testid="product-detail-weight"
                          className="min-w-0 text-foreground break-words"
                        >
                          {activeWeight} g
                        </dd>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {product.weight && (
                      <>
                        <dt className="text-muted-foreground">{t('product.weight')}</dt>
                        <dd
                          data-testid="product-detail-weight"
                          className="min-w-0 text-foreground break-words"
                        >
                          {product.weight}g
                        </dd>
                      </>
                    )}
                    {product.length && (
                      <>
                        <dt className="text-muted-foreground">{t('product.length')}</dt>
                        <dd className="min-w-0 text-foreground break-words">{product.length}&quot;</dd>
                      </>
                    )}
                    {availableLengths.length > 0 && (
                      <>
                        <dt className="text-muted-foreground">
                          {locale === 'es' ? 'Largos disponibles' : 'Available Lengths'}
                        </dt>
                        <dd className="min-w-0 text-foreground break-words">
                          {availableLengths.map((l) => parseVariantOptionAndSku(l).label).join(', ')}
                        </dd>
                      </>
                    )}
                  </>
                )}
                {availableVariations.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">
                      {locale === 'es' ? 'Variaciones' : 'Variations'}
                    </dt>
                    <dd className="min-w-0 text-foreground break-words">
                      {availableVariations.map((v) => parseVariantOptionAndSku(v).label).join(', ')}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none">
              <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
                {t('product.description')}
              </TabsTrigger>
              <TabsTrigger value="shipping" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
                {t('product.shipping')}
              </TabsTrigger>
              <TabsTrigger value="care" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
                {t('product.care')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-6">
              <p className="leading-relaxed text-muted-foreground">{displayDescription}</p>
            </TabsContent>
            <TabsContent value="shipping" className="mt-6">
              <div className="space-y-4 text-muted-foreground">
                <p>{locale === 'es' ? 'Envío asegurado estándar de $25 USD en todos los pedidos. Los pedidos se procesan en 1-2 días hábiles.' : 'Standard insured shipping is $25 USD on all orders. Orders are processed within 1-2 business days.'}</p>
                <p>All items are shipped fully insured via FedEx with signature required for delivery.</p>
                <p>International shipping available to select countries.</p>
              </div>
            </TabsContent>
            <TabsContent value="care" className="mt-6">
              <div className="space-y-4 text-muted-foreground">
                <p>Store your jewelry in the provided box when not wearing.</p>
                <p>Clean with a soft, lint-free cloth. Avoid harsh chemicals.</p>
                <p>Remove jewelry before swimming, exercising, or sleeping.</p>
                <p>Professional cleaning recommended every 6-12 months.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl font-bold text-foreground">
              {t('product.relatedProducts')}
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
