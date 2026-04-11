'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/lib/store/cart-store'
import { useTranslation } from '@/i18n/locale-context'
import { formatPrice } from '@/lib/format'

export function CartPageContent() {
  const { t } = useTranslation()
  const { items, removeItem, updateQuantity, subtotal } = useCartStore()
  const total = subtotal()

  if (items.length === 0) {
    return (
      <div className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="mt-6 font-serif text-2xl font-bold text-foreground">
              {t('cart.empty')}
            </h1>
            <p className="mt-2 text-muted-foreground">{t('cart.emptyMessage')}</p>
            <Button className="mt-6 gap-2" asChild>
              <Link href="/collections">
                {t('cart.continueShopping')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-foreground lg:text-4xl">
          {t('cart.title')}
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-card">
              {items.map((item, index) => (
                <div key={item.id}>
                  {index > 0 && <Separator />}
                  <div className="flex gap-4 p-4 sm:gap-6 sm:p-6">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-32 sm:w-32">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{item.name}</h3>
                          {item.size && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {t('product.size')}: {item.size}
                            </p>
                          )}
                          {item.karat && (
                            <p className="text-sm text-muted-foreground">{item.karat}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">{t('cart.remove')}</span>
                        </Button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-medium text-foreground">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button variant="outline" asChild>
                <Link href="/collections">{t('cart.continueShopping')}</Link>
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-border bg-card p-6">
              <h2 className="font-serif text-xl font-semibold text-foreground">
                {t('cartForm.orderSummary')}
              </h2>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                  <span className="text-foreground">{formatPrice(total)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('cart.shipping')}</span>
                  <span className="text-muted-foreground">{t('cart.shippingCalculated')}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{t('cart.total')}</span>
                  <span className="text-xl font-bold text-foreground">{formatPrice(total)}</span>
                </div>
              </div>

              <Button size="lg" className="mt-6 w-full gap-2" asChild>
                <Link href="/checkout">
                  {t('cart.checkout')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t('cartForm.secureCheckout')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
