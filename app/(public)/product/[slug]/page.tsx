import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from './product-detail'
import { db } from '@/lib/db'
import { createAdminProductService } from '@/lib/admin-products'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await db.product.findUnique({ where: { slug } })

  if (!product || !product.isActive) {
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
  let product = await db.product.findUnique({ where: { slug } })

  const productService = createAdminProductService(db)
  const metaStore = await productService.getCatalogMetadata()

  // Fallback: if accessed by custom SKU, resolve matching active product
  if (!product) {
    const matchedProductId = Object.entries(metaStore.products).find(
      ([, meta]) => meta?.sku && meta.sku.toLowerCase() === slug.toLowerCase()
    )?.[0]
    if (matchedProductId) {
      product = await db.product.findUnique({ where: { id: matchedProductId } })
    }
  }

  if (!product || !product.isActive || product.slug.startsWith('deleted-')) {
    notFound()
  }

  const prodMeta = metaStore.products[product.id] || {}
  const lowStockThreshold = prodMeta.lowStockThreshold ?? metaStore.lowStockThreshold

  // Get related products (same category, excluding current)
  const relatedDbProducts = await db.product.findMany({
    where: {
      category: { equals: product.category, mode: 'insensitive' },
      id: { not: product.id },
      isActive: true,
    },
    take: 4,
  })

  // Format products
  const formattedProduct = {
    ...product,
    nameEs: product.nameEs || product.name,
    descriptionEs: product.descriptionEs || product.description,
    karat: prodMeta.material || product.karat || '',
    metalType: prodMeta.metalColor || product.metalType || 'Yellow Gold',
    sku: prodMeta.sku || product.slug,
    lengths: prodMeta.lengths || [],
    variations: prodMeta.variations || [],
    lowStockThreshold,
    sizes: product.sizes,
  }

  const formattedRelated = relatedDbProducts.map((p) => {
    const relMeta = metaStore.products[p.id] || {}
    return {
      ...p,
      nameEs: p.nameEs || p.name,
      karat: relMeta.material || p.karat || '',
      metalType: relMeta.metalColor || p.metalType,
    }
  })

  return (
    <ProductDetail
      product={formattedProduct as any}
      relatedProducts={formattedRelated as any}
    />
  )
}
