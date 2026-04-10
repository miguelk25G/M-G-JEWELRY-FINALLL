import type { Metadata } from 'next'
import { SearchContent } from './search-content'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search our jewelry collection.',
}

export default async function SearchPage() {
  const dbProducts = await db.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })

  const mappedProducts = dbProducts.map(p => ({
    id: p.id,
    name: p.name,
    nameEs: p.nameEs || p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    images: p.images,
    category: p.category,
    metalType: p.metalType,
    karat: p.karat || '',
    stoneType: p.stoneType,
    isBestSeller: p.isBestSeller,
    inventoryQty: p.inventoryQty,
  }))

  return <SearchContent allProducts={mappedProducts as any} />
}
