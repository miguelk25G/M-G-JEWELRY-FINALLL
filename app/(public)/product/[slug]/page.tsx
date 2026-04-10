import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from './product-detail'
import { db } from '@/lib/db'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await db.product.findUnique({ where: { slug } })

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }
  
  let imageUrl = ''
  try {
     imageUrl = JSON.parse(product.images)[0]
  } catch {
     imageUrl = product.images
  }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [imageUrl],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await db.product.findUnique({ where: { slug } })

  if (!product) {
    notFound()
  }

  // Get related products (same category, excluding current)
  const relatedDbProducts = await db.product.findMany({
    where: { 
      category: product.category,
      id: { not: product.id },
      isActive: true
    },
    take: 4
  })

  // Format products
  const formattedProduct = {
    ...product,
    nameEs: product.nameEs || product.name,
    descriptionEs: product.descriptionEs || product.description,
    karat: product.karat || '',
    sizes: product.sizes || JSON.stringify(['5', '6', '7', '8']) // Adding default sizes if empty text for jewelry purposes
  }

  const formattedRelated = relatedDbProducts.map(p => ({
     ...p,
     nameEs: p.nameEs || p.name,
     karat: p.karat || '',
  }))

  return <ProductDetail product={formattedProduct as any} relatedProducts={formattedRelated as any} />
}

