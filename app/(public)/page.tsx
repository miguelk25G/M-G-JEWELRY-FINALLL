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
  const dbProducts = await db.product.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    where: { isActive: true }
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
      <FeaturedCategories />
      <BestSellersSection products={mappedProducts} />
      <WhiteGloveSection />
      <EducationSection />
      <TrustSection />
      <WhyMgSection />
    </>
  )
}

