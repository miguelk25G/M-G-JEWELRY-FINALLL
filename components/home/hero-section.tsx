'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/locale-context'
import { BrandConfig } from '@/lib/config/brand'

export function HeroSection() {
  const { t } = useTranslation()

  return (
    <section className="relative min-h-[90vh] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-background">
        <div 
          className="absolute inset-0 opacity-60" 
          style={{
            backgroundImage: 'url(/brand/hero-bg.png)',
            backgroundSize: '400px auto',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      </div>

      {/* Content */}
      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-center px-4 py-24 lg:min-h-[90vh] lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">
              {t('common.tagline')}
            </span>
          </div>

          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('hero.headline')}
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground lg:text-xl">
            {t('hero.subheadline')}
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 text-base" asChild>
              <Link href="/collections/best-sellers">
                {t('hero.shopBestSellers')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base bg-transparent"
              asChild
            >
              <Link href="/white-glove">
                <Sparkles className="h-4 w-4" />
                {t('hero.whiteGlove')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-col gap-8 sm:flex-row sm:flex-wrap sm:gap-12 lg:gap-24 lg:mt-24">
          <div>
            <p className="font-serif text-2xl font-bold text-foreground lg:text-3xl">{t('hero.stat1Num')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('hero.stat1Desc')}</p>
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-foreground lg:text-3xl">{t('hero.stat2Num')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('hero.stat2Desc')}</p>
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-foreground lg:text-3xl">{t('hero.stat3Num')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('hero.stat3Desc')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

