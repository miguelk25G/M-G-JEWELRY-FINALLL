'use client'

import { ShieldCheck, Truck, Headphones, RotateCcw } from 'lucide-react'
import { BrandConfig } from '@/lib/config/brand'
import { useTranslation } from '@/i18n/locale-context'

export function WhyMgSection() {
  const { t, locale } = useTranslation()
  
  // Since we don't have these explicitly in i18n yet, we will fallback manually
  // I will define the arrays directly here. In Phase 6, we can move them to JSON.
  const cards = [
    {
      icon: ShieldCheck,
      title_en: 'Authenticity Promise',
      title_es: 'Promesa de Autenticidad',
      desc_en: 'Every piece is certified and meticulously inspected for uncompromising quality.',
      desc_es: 'Cada pieza está certificada y meticulosamente inspeccionada para garantizar una calidad sin concesiones.',
    },
    {
      icon: Truck,
      title_en: 'Secure Shipping',
      title_es: 'Envíos Seguros',
      desc_en: 'Fully insured, tracked, and discreetly packaged for your peace of mind.',
      desc_es: 'Totalmente asegurado, con seguimiento y empaquetado discretamente para su tranquilidad.',
    },
    {
      icon: Headphones,
      title_en: `${BrandConfig.SERVICE_NAME_EN} Guidance`,
      title_es: `Asesoría ${BrandConfig.SERVICE_NAME_ES}`,
      desc_en: 'Dedicated White-Glove team available to guide you through your purchase.',
      desc_es: 'Equipo dedicado disponible para asesorarte durante tu compra.',
    },
    {
      icon: RotateCcw,
      title_en: 'Clear Support & Returns',
      title_es: 'Soporte y Devoluciones',
      desc_en: '14-day return window and a generous warranty on all jewelry.',
      desc_es: 'Ventana de devolución de 14 días y garantía generosa en todas las joyas.',
    }
  ]

  return (
    <section className="py-24 bg-card/30 relative">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 relative z-10">
        <div className="mb-16 text-center">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            {locale === 'es' ? '¿Por qué elegir M&G?' : 'Why Choose M&G?'}
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 border border-border/50 rounded-lg bg-card hover:border-accent transition-colors">
              <div className="mb-4 rounded-full bg-accent/10 p-3 text-accent">
                <card.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-serif text-xl font-medium">
                {locale === 'es' ? card.title_es : card.title_en}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {locale === 'es' ? card.desc_es : card.desc_en}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

