import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Browse our curated collections of luxury diamond jewelry.',
}

import { db } from '@/lib/db'

export default async function CollectionsPage() {
  const dbCollections = await db.collection.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { products: true }
      }
    }
  })
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
          {dbCollections.map((collection) => (
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
                    {collection._count.products} products
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
