import type { Metadata } from 'next'
import { SearchContent } from './search-content'
import { db } from '@/lib/db'
import { createBestSellersService } from '@/lib/best-sellers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search our jewelry collection.',
}

export default async function SearchPage() {
  const bestSellersService = createBestSellersService(db)
  const [catalogProducts, badgeMap] = await Promise.all([
    bestSellersService.loadNormalizedCatalogProducts(),
    bestSellersService.getProductBadgesMap(),
  ])

  const mappedProducts = catalogProducts
    .filter((p) => p.isActive)
    .map((p) => {
      const showcaseBadge = badgeMap[p.id] || 'none'
      return {
        id: p.id,
        name: p.name,
        nameEs: p.nameEs,
        slug: p.slug,
        price: p.price,
        comparePrice: p.comparePrice,
        images: p.images,
        category: p.category,
        metalType: p.metalType,
        karat: p.karat,
        stoneType: p.stoneType,
        isBestSeller: showcaseBadge === 'best_seller',
        isFeatured: p.isFeatured,
        showcaseBadge,
        inventoryQty: p.inventoryQty,
        sizes: p.sizes,
        hasVariants: p.hasVariants,
      }
    })

  return <SearchContent allProducts={mappedProducts as any} />
}
