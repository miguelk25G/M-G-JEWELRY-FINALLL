'use client'

import Link from 'next/link'
import { Ruler, Scale, Diamond, Sparkles, ArrowRight, Gem, Disc } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from '@/i18n/locale-context'

const guides = [
  {
    key: 'karatGuide',
    icon: Scale,
    href: '/education',
  },
  {
    key: 'chainLengths',
    icon: Ruler,
    href: '/education',
  },
  {
    key: 'bracelets',
    icon: Disc,
    href: '/education',
  },
  {
    key: 'earrings',
    icon: Sparkles,
    href: '/education',
  },
  {
    key: 'labVsNatural',
    icon: Diamond,
    href: '/education',
  },
  {
    key: 'careGuide',
    icon: Sparkles,
    href: '/education',
  },
]

export function EducationSection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground lg:text-4xl">
            {t('education.title')}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t('education.subtitle')}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link key={guide.key} href={guide.href}>
              <Card className="group h-full border-border bg-card transition-colors hover:bg-secondary">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary group-hover:bg-background">
                    <guide.icon className="h-7 w-7 text-foreground" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">
                    {t(`education.${guide.key}`)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(`education.${guide.key}Desc`)}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-foreground">
                    <span>Learn more</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
