'use client'

import Link from 'next/link'
import { MessageSquare, Sparkles, Heart, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/locale-context'

const steps = [
  {
    icon: MessageSquare,
    titleKey: 'step1Title',
    descKey: 'step1Desc',
  },
  {
    icon: Sparkles,
    titleKey: 'step2Title',
    descKey: 'step2Desc',
  },
  {
    icon: Heart,
    titleKey: 'step3Title',
    descKey: 'step3Desc',
  },
]

export function WhiteGloveSection() {
  const { t } = useTranslation()

  return (
    <section className="light-section bg-[oklch(0.98_0_0)] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.1_0_0)]">
            <Sparkles className="h-6 w-6 text-[oklch(0.98_0_0)]" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-[oklch(0.1_0_0)] lg:text-4xl">
            {t('whiteGlove.title')}
          </h2>
          <p className="mt-4 text-lg text-[oklch(0.4_0_0)]">
            {t('whiteGlove.subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.titleKey}
              className="relative rounded-xl border border-[oklch(0.85_0_0)] bg-[oklch(0.99_0_0)] p-8 text-center"
            >
              <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-[oklch(0.1_0_0)] text-sm font-semibold text-[oklch(0.98_0_0)]">
                {index + 1}
              </div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.95_0_0)]">
                <step.icon className="h-7 w-7 text-[oklch(0.1_0_0)]" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[oklch(0.1_0_0)]">
                {t(`whiteGlove.${step.titleKey}`)}
              </h3>
              <p className="mt-2 text-sm text-[oklch(0.4_0_0)]">
                {t(`whiteGlove.${step.descKey}`)}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button
            size="lg"
            className="gap-2 bg-[oklch(0.1_0_0)] text-[oklch(0.98_0_0)] hover:bg-[oklch(0.2_0_0)]"
            asChild
          >
            <Link href="/white-glove">
              {t('whiteGlove.cta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

