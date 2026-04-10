import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CollectionContent } from './collection-content'
import { db } from '@/lib/db'

// Collections Metadata mapping
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
    name: 'Chains',
    nameEs: 'Cadenas',
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
  rings: {
    name: 'Rings',
    nameEs: 'Anillos',
    description: 'Beautiful rings crafted thoughtfully to stand out.',
    descriptionEs: 'Hermosos anillos meticulosamente diseñados.',
  }
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const collection = collections[slug.toLowerCase()]
  
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
  const collectionKey = slug.toLowerCase()
  const collection = collections[collectionKey] || {
     name: slug.charAt(0).toUpperCase() + slug.slice(1),
     nameEs: slug.charAt(0).toUpperCase() + slug.slice(1),
     description: "Explore our collection.",
     descriptionEs: "Explora nuestra colección."
  }

  let dbQuery = {}
  
  if (collectionKey === 'best-sellers') {
    dbQuery = { isBestSeller: true, isActive: true }
  } else if (collectionKey === 'diamond-rings') {
    dbQuery = { category: { equals: 'rings', mode: 'insensitive' }, isActive: true }
  } else {
    dbQuery = { category: { equals: collectionKey, mode: 'insensitive' }, isActive: true }
  }

  const dbProducts = await db.product.findMany({
      where: dbQuery as any,
      orderBy: { createdAt: 'desc' }
  })

  // Format products
  const formattedProducts = dbProducts.map(p => ({
     ...p,
     nameEs: p.nameEs || p.name,
     karat: p.karat || '',
  }))

  return (
    <CollectionContent
      collection={collection}
      products={formattedProducts as any}
    />
  )
}
