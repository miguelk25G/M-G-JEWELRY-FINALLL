import { HeroSection } from '@/components/home/hero-section'
import { FeaturedCategories } from '@/components/home/featured-categories'
import { BestSellersSection } from '@/components/home/best-sellers-section'
import { WhiteGloveSection } from '@/components/home/white-glove-section'
import { EducationSection } from '@/components/home/education-section'
import { TrustSection } from '@/components/home/trust-section'
import { WhyMgSection } from '@/components/home/why-mg-section'

// Mock data for now - will be replaced with database queries
const mockBestSellers = [
  {
    id: '1',
    name: '2.99 Carat Diamond Ring',
    nameEs: 'Anillo de Diamante 2.99 Quilates',
    slug: '2-99-carat-diamond-ring',
    price: 10750,
    comparePrice: 12500,
    images: JSON.stringify(['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800']),
    category: 'rings',
    metalType: 'gold',
    karat: '14k',
    stoneType: 'natural',
    isBestSeller: true,
    inventoryQty: 3,
  },
  {
    id: '2',
    name: '1.75 Carat Diamond Ring',
    nameEs: 'Anillo de Diamante 1.75 Quilates',
    slug: '1-75-carat-diamond-ring',
    price: 9875,
    comparePrice: null,
    images: JSON.stringify(['https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800']),
    category: 'rings',
    metalType: 'gold',
    karat: '18k',
    stoneType: 'natural',
    isBestSeller: true,
    inventoryQty: 5,
  },
  {
    id: '3',
    name: 'Cuban Link Chain 14K',
    nameEs: 'Cadena EslabÃ³n Cubano 14K',
    slug: 'cuban-link-chain-14k',
    price: 4250,
    comparePrice: 4800,
    images: JSON.stringify(['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800']),
    category: 'chains',
    metalType: 'gold',
    karat: '14k',
    stoneType: 'none',
    isBestSeller: true,
    inventoryQty: 10,
  },
  {
    id: '4',
    name: 'Diamond Stud Earrings',
    nameEs: 'Aretes de Diamante',
    slug: 'diamond-stud-earrings',
    price: 2450,
    comparePrice: null,
    images: JSON.stringify(['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800']),
    category: 'earrings',
    metalType: 'gold',
    karat: '14k',
    stoneType: 'natural',
    isBestSeller: true,
    inventoryQty: 15,
  },
]

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedCategories />
      <BestSellersSection products={mockBestSellers} />
      <WhiteGloveSection />
      <EducationSection />
      <TrustSection />
      <WhyMgSection />
    </>
  )
}

