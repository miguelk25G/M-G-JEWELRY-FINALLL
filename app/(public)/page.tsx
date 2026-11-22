import { HeroSection } from '@/components/home/hero-section'
import { FeaturedCategories } from '@/components/home/featured-categories'
import { BestSellersSection } from '@/components/home/best-sellers-section'
import { WhiteGloveSection } from '@/components/home/white-glove-section'
import { EducationSection } from '@/components/home/education-section'
import { TrustSection } from '@/components/home/trust-section'
import { WhyMgSection } from '@/components/home/why-mg-section'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // The homepage and /collections/best-sellers must use the same selection rule.
  // Until an admin marks products as Best Seller, show active new arrivals instead of an empty section.
  const markedBestSellers = await db.product.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    where: { isActive: true, isBestSeller: true },
  })
  const dbProducts = markedBestSellers.length > 0
    ? markedBestSellers
    : await db.product.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        where: { isActive: true },
      })
  
  const dbCollections = await db.collection.findMany({
    take: 3,
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  // Format products so they match what BestSellersSection expects
  const mappedProducts = dbProducts.map(p => ({
    id: p.id,
    name: p.name,
    nameEs: p.nameEs || p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    images: p.images, // Stored as a JSON string array natively in Postgres
    category: p.category,
    metalType: p.metalType,
    karat: p.karat || '',
    stoneType: p.stoneType,
    isBestSeller: p.isBestSeller,
    inventoryQty: p.inventoryQty,
  }))

  return (
    <>
      <HeroSection />
      <FeaturedCategories categories={dbCollections} />
      <BestSellersSection products={mappedProducts} />
      <WhiteGloveSection />
      <EducationSection />
      <TrustSection />
      <WhyMgSection />
    </>
  )
}

