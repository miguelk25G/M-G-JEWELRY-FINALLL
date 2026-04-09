'use client'

import { ShieldCheck, Truck, RotateCcw } from 'lucide-react'
import { useTranslation } from '@/i18n/locale-context'

const trustItems = [
  {
    key: 'authenticity',
    icon: ShieldCheck,
  },
  {
    key: 'shipping',
    icon: Truck,
  },
  {
    key: 'returns',
    icon: RotateCcw,
  },
]

export function TrustSection() {
  const { t } = useTranslation()

  return (
    <section className="border-y border-border bg-secondary/50 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="sr-only">{t('trust.title')}</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {trustItems.map((item) => (
            <div
              key={item.key}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background">
                <item.icon className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">
                {t(`trust.${item.key}`)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`trust.${item.key}Desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
