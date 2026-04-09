'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from '@/i18n/locale-context'

const categories = [
  {
    key: 'chains',
    href: '/collections/chains',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
  },
  {
    key: 'bracelets',
    href: '/collections/bracelets',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
  },
  {
    key: 'earrings',
    href: '/collections/earrings',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
  },
]

export function FeaturedCategories() {
  const { t } = useTranslation()

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold text-foreground lg:text-4xl">
              {t('featured.title')}
            </h2>
          </div>
          <Link
            href="/collections"
            className="group hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            {t('featured.viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Categories Grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.key}
              href={category.href}
              className="group relative aspect-[4/5] overflow-hidden rounded-xl"
            >
              <Image
                src={category.image || "/placeholder.svg"}
                alt={t(`featured.${category.key}`)}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-serif text-2xl font-semibold text-foreground">
                  {t(`featured.${category.key}`)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(`featured.${category.key}Desc`)}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <span>{t('featured.viewAll')}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile View All Link */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            {t('featured.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
