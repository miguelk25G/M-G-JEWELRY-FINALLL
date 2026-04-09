'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/product/product-card'
import { useTranslation } from '@/i18n/locale-context'

interface Product {
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

interface BestSellersSectionProps {
  products: Product[]
}

export function BestSellersSection({ products }: BestSellersSectionProps) {
  const { t } = useTranslation()

  if (products.length === 0) return null

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold text-foreground lg:text-4xl">
              {t('bestSellers.title')}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t('bestSellers.subtitle')}
            </p>
          </div>
          <Link
            href="/collections/best-sellers"
            className="group hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            {t('featured.viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Mobile View All Link */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/collections/best-sellers"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            {t('featured.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
