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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  nameEs: string | null
  slug: string
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
  inventoryQty: number
  weight?: number | null
  length?: number | null
  sizes: string | null
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
  inventoryQty: number
}

interface ProductDetailProps {
  product: Product
  relatedProducts: RelatedProduct[]
}

export function ProductDetail({ product, relatedProducts }: ProductDetailProps) {
  const { t, locale } = useTranslation()
  const addToCart = useCartStore((state) => state.addItem)
  const { toggleItem, isFavorite } = useFavoritesStore()

  const images = JSON.parse(product.images) as string[]
  const sizes = product.sizes ? (JSON.parse(product.sizes) as string[]) : null

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string | null>(sizes?.[0] || null)
  const [quantity, setQuantity] = useState(1)

  const displayName = locale === 'es' && product.nameEs ? product.nameEs : product.name
  const displayDescription = locale === 'es' && product.descriptionEs ? product.descriptionEs : product.description
  const isOnSale = product.comparePrice && product.comparePrice > product.price
  const isLowStock = product.inventoryQty > 0 && product.inventoryQty <= 3
  const isOutOfStock = product.inventoryQty === 0
  const favorite = isFavorite(product.id)

  const handleAddToCart = () => {
    if (sizes && !selectedSize) {
      toast.error('Please select a size')
      return
    }
    addToCart({
      productId: product.id,
      name: displayName,
      price: product.price,
      image: images[0],
      quantity,
      size: selectedSize || undefined,
      metalType: product.metalType,
      karat: product.karat || undefined,
    })
    toast.success(t('product.addedToCart'))
  }

  const handleFavorite = () => {
    toggleItem({
      id: product.id,
      name: displayName,
      price: product.price,
      image: images[0],
      slug: product.slug,
    })
  }

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
              {isOnSale && (
                <Badge variant="destructive" className="absolute left-4 top-4">
                  Sale
                </Badge>
              )}
              {product.isBestSeller && (
                <Badge variant="secondary" className="absolute left-4 top-12">
                  Best Seller
                </Badge>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-3">
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
                      src={image || "/placeholder.svg"}
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

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-foreground">
                {formatPrice(product.price, product.currency)}
              </span>
              {isOnSale && product.comparePrice && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.comparePrice, product.currency)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div>
              {isOutOfStock ? (
                <Badge variant="outline" className="text-destructive">
                  {t('product.outOfStock')}
                </Badge>
              ) : isLowStock ? (
                <Badge variant="outline" className="border-amber-500 text-amber-500">
                  {t('product.lowStock', { count: product.inventoryQty })}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-green-500 text-green-500">
                  {t('product.inStock')}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Size Selection */}
            {sizes && (
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  {t('product.size')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        'flex h-10 w-12 items-center justify-center rounded-md border text-sm transition-colors',
                        selectedSize === size
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-transparent hover:border-foreground'
                      )}
                    >
                      {size}
                    </button>
                  ))}
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
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= product.inventoryQty}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingBag className="h-5 w-5" />
                {t('product.addToCart')}
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

            {/* Ask Concierge */}
            <Button variant="secondary" className="w-full gap-2" asChild>
              <Link href={`/concierge?product=${product.slug}`}>
                <MessageCircle className="h-4 w-4" />
                {t('product.askConcierge')}
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
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">{t('product.metal')}</dt>
                <dd className="text-foreground capitalize">{product.metalType}</dd>
                {product.karat && (
                  <>
                    <dt className="text-muted-foreground">{t('product.karat')}</dt>
                    <dd className="text-foreground uppercase">{product.karat}</dd>
                  </>
                )}
                {product.stoneType !== 'none' && (
                  <>
                    <dt className="text-muted-foreground">{t('product.stone')}</dt>
                    <dd className="text-foreground capitalize">{product.stoneType} Diamond</dd>
                  </>
                )}
                {product.weight && (
                  <>
                    <dt className="text-muted-foreground">{t('product.weight')}</dt>
                    <dd className="text-foreground">{product.weight}g</dd>
                  </>
                )}
                {product.length && (
                  <>
                    <dt className="text-muted-foreground">{t('product.length')}</dt>
                    <dd className="text-foreground">{product.length}&quot;</dd>
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
                <p>Free shipping on all orders over $500. Orders are processed within 1-2 business days.</p>
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
