import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CollectionContent } from './collection-content'

// Mock collections data
const collections: Record<string, { name: string; nameEs: string; description: string; descriptionEs: string }> = {
  'best-sellers': {
    name: 'Best Sellers',
    nameEs: 'Más Vendidos',
    description: 'Our most loved pieces, chosen by our customers.',
    descriptionEs: 'Nuestras piezas más amadas, elegidas por nuestros clientes.',
  },
  'diamond-rings': {
    name: 'Diamond Rings',
    nameEs: 'Anillos de Diamantes',
    description: 'Stunning diamond rings for every occasion.',
    descriptionEs: 'Impresionantes anillos de diamantes para cada ocasión.',
  },
  chains: {
    name: 'Gold Chains',
    nameEs: 'Cadenas de Oro',
    description: 'Classic and modern gold chains in various styles.',
    descriptionEs: 'Cadenas de oro clásicas y modernas en varios estilos.',
  },
  bracelets: {
    name: 'Bracelets',
    nameEs: 'Pulseras',
    description: 'Elegant bracelets and bangles for every wrist.',
    descriptionEs: 'Elegantes pulseras y brazaletes para cada muñeca.',
  },
  earrings: {
    name: 'Earrings',
    nameEs: 'Aretes',
    description: 'From studs to drops, find your perfect sparkle.',
    descriptionEs: 'De studs a colgantes, encuentra tu brillo perfecto.',
  },
  necklaces: {
    name: 'Necklaces',
    nameEs: 'Collares',
    description: 'Statement necklaces and delicate pendants.',
    descriptionEs: 'Collares statement y colgantes delicados.',
  },
}

// Mock products
const mockProducts = [
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
    nameEs: 'Cadena Eslabón Cubano 14K',
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
    name: 'Diamond Tennis Bracelet',
    nameEs: 'Pulsera Tenis de Diamantes',
    slug: 'diamond-tennis-bracelet',
    price: 8500,
    comparePrice: null,
    images: JSON.stringify(['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800']),
    category: 'bracelets',
    metalType: 'gold',
    karat: '18k',
    stoneType: 'natural',
    isBestSeller: false,
    inventoryQty: 4,
  },
  {
    id: '5',
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
  {
    id: '6',
    name: 'Solitaire Diamond Necklace',
    nameEs: 'Collar de Diamante Solitario',
    slug: 'solitaire-diamond-necklace',
    price: 3750,
    comparePrice: null,
    images: JSON.stringify(['https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800']),
    category: 'necklaces',
    metalType: 'gold',
    karat: '18k',
    stoneType: 'natural',
    isBestSeller: false,
    inventoryQty: 6,
  },
]

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const collection = collections[slug]
  
  if (!collection) {
    return {
      title: 'Collection Not Found',
    }
  }
  
  return {
    title: collection.name,
    description: collection.description,
  }
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params
  const collection = collections[slug]

  if (!collection) {
    notFound()
  }

  // Filter products based on collection slug
  let products = mockProducts
  if (slug === 'best-sellers') {
    products = mockProducts.filter((p) => p.isBestSeller)
  } else if (slug === 'diamond-rings') {
    products = mockProducts.filter((p) => p.category === 'rings')
  } else if (slug !== 'best-sellers') {
    products = mockProducts.filter((p) => p.category === slug)
  }

  return (
    <CollectionContent
      collection={collection}
      products={products}
    />
  )
}
