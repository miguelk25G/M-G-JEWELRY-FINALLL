'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Search, ShoppingBag, Heart, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from '@/components/brand/logo'
import { useTranslation } from '@/i18n/locale-context'
import { useCartStore } from '@/lib/store/cart-store'
import { useFavoritesStore } from '@/lib/store/favorites-store'
import { LanguageSwitcher } from './language-switcher'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { cn } from '@/lib/utils'

const navigation = [
  { key: 'collections', href: '/collections' },
  { key: 'chains', href: '/collections/chains' },
  { key: 'bracelets', href: '/collections/bracelets' },
  { key: 'earrings', href: '/collections/earrings' },
  { key: 'bestSellers', href: '/collections/best-sellers' },
  { key: 'whiteGlove', href: '/white-glove' },
]

export function Header() {
  const { t } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const cartItemCount = useCartStore((state) => state.itemCount())
  const favoritesCount = useFavoritesStore((state) => state.itemCount())
  const openCart = useCartStore((state) => state.openCart)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-m-2.5 w-12 h-12">
                <span className="sr-only">Open menu</span>
                <Menu className="!h-8 !w-8" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs bg-background">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex items-center justify-between pt-1">
                <Logo variant="icon" size="sm" />
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-border">
                  <div className="space-y-2 py-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="block rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-accent"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t(`nav.${item.key}`)}
                      </Link>
                    ))}
                  </div>
                  <div className="py-6">
                    <Link
                      href="/about"
                      className="block rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('nav.about')}
                    </Link>
                    <Link
                      href="/education"
                      className="block rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('nav.education')}
                    </Link>
                    <Link
                      href="/contact"
                      className="block rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('nav.contact')}
                    </Link>
                  </div>
                  <div className="py-6">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <div className="flex z-10 lg:flex-1">
          <Logo variant="icon" size="sm" className="lg:hidden" />
          <Logo variant="icon" size="md" className="hidden lg:flex" />
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t('nav.about')}
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-background">
              <DropdownMenuItem asChild>
                <Link href="/about">{t('nav.about')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/education">{t('nav.education')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/faq">{t('nav.faq')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/contact">{t('nav.contact')}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side actions */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search">
              <Search className="h-5 w-5" />
              <span className="sr-only">{t('nav.search')}</span>
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/favorites">
              <Heart className="h-5 w-5" />
              {favoritesCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {favoritesCount}
                </span>
              )}
              <span className="sr-only">{t('favorites.title')}</span>
            </Link>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={openCart}
          >
            <ShoppingBag className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {cartItemCount}
              </span>
            )}
            <span className="sr-only">{t('nav.cart')}</span>
          </Button>
        </div>
      </nav>
      
      <CartDrawer />
    </header>
  )
}

