import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { CollectionContent } from './collection-content'
import { db } from '@/lib/db'
import { defaultLocale, type Locale } from '@/i18n/config'
import {
  createBestSellersService,
  type ShowcaseHeadingType,
} from '@/lib/best-sellers'

export const dynamic = 'force-dynamic'

// Collections Metadata mapping
const collections: Record<
  string,
  { name: string; nameEs: string; description: string; descriptionEs: string }
> = {
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
  },
}

function getBestSellersCollectionMeta(headingType: ShowcaseHeadingType) {
  if (headingType === 'mg_picks') {
    return {
      name: 'M&G Picks',
      nameEs: 'Selección M&G',
      description: 'Featured pieces hand-selected by M&G Jewelry.',
      descriptionEs: 'Piezas destacadas elegidas personalmente por M&G Jewelry.',
    }
  }
  if (headingType === 'featured_fallback') {
    return {
      name: 'Featured Products',
      nameEs: 'Productos Destacados',
      description: 'Explore our curated fine jewelry collection.',
      descriptionEs: 'Explora nuestra colección curada de alta joyería.',
    }
  }
  if (headingType === 'hybrid') {
    return {
      name: 'Best Sellers',
      nameEs: 'Más Vendidos',
      description: 'M&G Picks and our top-selling customer favorites.',
      descriptionEs: 'Selección M&G y las piezas más vendidas por nuestros clientes.',
    }
  }
  return collections['best-sellers']
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

  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value || defaultLocale) as Locale

  const collectionKey = slug.toLowerCase()
  const bestSellersService = createBestSellersService(db)

  // Shared single source of truth for /collections/best-sellers and Homepage
  if (collectionKey === 'best-sellers') {
    const selection = await bestSellersService.getStorefrontSelection()
    const meta = getBestSellersCollectionMeta(selection.headingType)

    return (
      <CollectionContent
        collection={{
          name: meta.name,
          nameEs: meta.nameEs,
          description: meta.description,
          descriptionEs: meta.descriptionEs,
        }}
        products={selection.allProducts}
        locale={locale}
      />
    )
  }

  // Attempt to fetch collection metadata from DB first
  const [dbCollection, normalizedCatalog, badgeMap] = await Promise.all([
    db.collection.findUnique({
      where: { slug: collectionKey },
    }),
    bestSellersService.loadNormalizedCatalogProducts(),
    bestSellersService.getProductBadgesMap(),
  ])

  const fallbackCollection = collections[collectionKey] || {
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    nameEs: slug.charAt(0).toUpperCase() + slug.slice(1),
    description: 'Explore our collection.',
    descriptionEs: 'Explora nuestra colección.',
  }

  const finalCollectionInfo = {
    name: dbCollection?.name || fallbackCollection.name,
    nameEs: dbCollection?.nameEs || fallbackCollection.nameEs || dbCollection?.name || fallbackCollection.name,
    description: dbCollection?.description || fallbackCollection.description,
    descriptionEs:
      dbCollection?.descriptionEs ||
      fallbackCollection.descriptionEs ||
      dbCollection?.description ||
      fallbackCollection.description,
  }

  const targetCategory = collectionKey === 'diamond-rings' ? 'rings' : collectionKey

  const matchingProducts = normalizedCatalog
    .filter((p) => p.isActive && p.category.toLowerCase() === targetCategory)
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
        createdAt: p.createdAt.toISOString(),
      }
    })

  return (
    <CollectionContent
      collection={finalCollectionInfo}
      products={matchingProducts}
      locale={locale}
    />
  )
}
