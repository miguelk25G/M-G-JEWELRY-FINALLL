'use client'

import Link from 'next/link'
import { Instagram, Phone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/brand/logo'
import { useTranslation } from '@/i18n/locale-context'
import { LanguageSwitcher } from './language-switcher'
import { BrandConfig } from '@/lib/config/brand'

export function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    shop: [
      { label: t('nav.collections'), href: '/collections' },
      { label: t('nav.chains'), href: '/collections/chains' },
      { label: t('nav.bracelets'), href: '/collections/bracelets' },
      { label: t('nav.earrings'), href: '/collections/earrings' },
      { label: t('nav.bestSellers'), href: '/collections/best-sellers' },
    ],
    company: [
      { label: t('nav.about'), href: '/about' },
      { label: t('nav.whiteGlove'), href: '/white-glove' },
      { label: t('nav.education'), href: '/education' },
      { label: t('nav.vip'), href: '/mg-family' },
      { label: t('nav.contact'), href: '/contact' },
    ],
    support: [
      { label: t('nav.faq'), href: '/faq' },
      { label: t('footer.shipping'), href: '/policies/shipping' },
      { label: t('footer.returns'), href: '/policies/returns' },
      { label: t('footer.warranty'), href: '/policies/warranty' },
    ],
  }

  return (
    <footer className="relative border-t border-border bg-background overflow-hidden">
      {BrandConfig.PATTERN_ENABLED && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            backgroundImage: 'url(/brand/pattern-mg.png)',
            opacity: BrandConfig.PATTERN_OPACITY,
            backgroundSize: '300px 300px',
            backgroundRepeat: 'repeat'
          }}
        />
      )}
      <div className="relative z-10 w-full">
      {/* Newsletter Section */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h3 className="font-serif text-2xl font-semibold text-foreground">
              {t('newsletter.title')}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {t('newsletter.subtitle')}
            </p>
            <form className="mt-6 flex w-full max-w-md gap-2">
              <Input
                type="email"
                placeholder={t('newsletter.placeholder')}
                className="flex-1 bg-secondary"
                required
              />
              <Button type="submit">{t('newsletter.submit')}</Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('newsletter.privacy')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Logo size="md" />
            <p className="mt-4 text-sm text-muted-foreground">
              {t('common.tagline')}
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" size="icon" asChild>
                <a
                  href={BrandConfig.CONTACT.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a
                  href={`https://wa.me/${BrandConfig.CONTACT.whatsappNumber.replace(/\+/g, '')}?text=Hi%2C%20I%27m%20interested%20in%20M%26G%20Jewelry`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={`tel:${BrandConfig.CONTACT.phoneNumber}`} aria-label="Phone">
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {t('footer.shop')}
            </h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {t('footer.company')}
            </h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {t('footer.support')}
            </h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            {t('footer.copyright', { year: currentYear })}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/policies/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              href="/policies/terms"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('footer.terms')}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
      </div>
    </footer>
  )
}

