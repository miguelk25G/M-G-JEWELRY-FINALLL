import { HeroSection } from '@/components/home/hero-section'
import { FeaturedCategories } from '@/components/home/featured-categories'
import { BestSellersSection } from '@/components/home/best-sellers-section'
import { WhiteGloveSection } from '@/components/home/white-glove-section'
import { EducationSection } from '@/components/home/education-section'
import { TrustSection } from '@/components/home/trust-section'
import { WhyMgSection } from '@/components/home/why-mg-section'
import { db } from '@/lib/db'
import { createBestSellersService } from '@/lib/best-sellers'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const bestSellersService = createBestSellersService(db)

  const [bestSellersSelection, dbCollections] = await Promise.all([
    bestSellersService.getStorefrontSelection(),
    db.collection.findMany({
      take: 3,
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <>
      <HeroSection />
      <FeaturedCategories categories={dbCollections} />
      <BestSellersSection
        products={bestSellersSelection.homepageProducts}
        headingType={bestSellersSelection.headingType}
      />
      <WhiteGloveSection />
      <EducationSection />
      <TrustSection />
      <WhyMgSection />
    </>
  )
}
