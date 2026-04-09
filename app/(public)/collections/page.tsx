import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Browse our curated collections of luxury diamond jewelry.',
}

const collections = [
  {
    name: 'Best Sellers',
    nameEs: 'Más Vendidos',
    slug: 'best-sellers',
    description: 'Our most loved pieces',
    descriptionEs: 'Nuestras piezas más amadas',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    productCount: 12,
  },
  {
    name: 'Diamond Rings',
    nameEs: 'Anillos de Diamantes',
    slug: 'diamond-rings',
    description: 'Stunning diamond rings for every occasion',
    descriptionEs: 'Impresionantes anillos de diamantes para cada ocasión',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    productCount: 24,
  },
  {
    name: 'Gold Chains',
    nameEs: 'Cadenas de Oro',
    slug: 'chains',
    description: 'Classic and modern gold chains',
    descriptionEs: 'Cadenas de oro clásicas y modernas',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
    productCount: 18,
  },
  {
    name: 'Bracelets',
    nameEs: 'Pulseras',
    slug: 'bracelets',
    description: 'Elegant bracelets and bangles',
    descriptionEs: 'Elegantes pulseras y brazaletes',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    productCount: 15,
  },
  {
    name: 'Earrings',
    nameEs: 'Aretes',
    slug: 'earrings',
    description: 'From studs to drops, find your sparkle',
    descriptionEs: 'De studs a colgantes, encuentra tu brillo',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    productCount: 20,
  },
  {
    name: 'Necklaces',
    nameEs: 'Collares',
    slug: 'necklaces',
    description: 'Statement necklaces and pendants',
    descriptionEs: 'Collares y colgantes statement',
    image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800',
    productCount: 16,
  },
]

export default function CollectionsPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-serif text-4xl font-bold text-foreground lg:text-5xl">
            Collections
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore our curated collections of luxury diamond jewelry
          </p>
        </div>

        {/* Collections Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.slug}
              href={`/collections/${collection.slug}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-secondary"
            >
              <Image
                src={collection.image || "/placeholder.svg"}
                alt={collection.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  {collection.name}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {collection.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {collection.productCount} products
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                    View Collection
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
