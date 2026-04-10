'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Send, ShieldCheck, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCartStore } from '@/lib/store/cart-store'
import { useTranslation } from '@/i18n/locale-context'
import { formatPrice } from '@/lib/format'
import { submitConciergeOrder } from '@/lib/actions/checkout'

export function CheckoutContent() {
  const { t } = useTranslation()
  const { items, subtotal, clearCart } = useCartStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const total = subtotal()
  const shipping = total > 500 ? 0 : 25
  const tax = total * 0.08
  const finalTotal = total + shipping + tax

  if (items.length === 0) {
    return (
      <div className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="mt-6 font-serif text-2xl font-bold text-foreground">
              Your cart is empty
            </h1>
            <p className="mt-2 text-muted-foreground">Add some items to checkout</p>
            <Button className="mt-6" asChild>
              <Link href="/collections/rings">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsProcessing(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      const res = await submitConciergeOrder(formData, items)
      
      if (res.success) {
        clearCart()
        window.location.href = res.waLink
      }
    } catch (err) {
      console.error(err)
      alert("There was an error processing your request. Please try again.")
      setIsProcessing(false)
    }
  }

  return (
    <div className="py-8 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Back Link */}
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Link>

        <h1 className="mt-6 font-serif text-3xl font-bold text-foreground lg:text-4xl">
          Complete Your Request
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          By submitting this form, you will be connected directly via WhatsApp to our concierge jeweler to arrange secure payment and safe delivery logistics.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {/* Checkout Form */}
            <div className="space-y-8 lg:col-span-2">
              {/* Contact Information */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  {t('checkout.contact')}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="phone">WhatsApp Phone</Label>
                    <div className="mt-1.5 flex gap-2">
                      <Select defaultValue="+1" name="phonePrefix">
                        <SelectTrigger className="w-[100px] bg-secondary">
                          <SelectValue placeholder="Code" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="+1">+1 (US/CA)</SelectItem>
                          <SelectItem value="+44">+44 (UK)</SelectItem>
                          <SelectItem value="+52">+52 (Mexico)</SelectItem>
                          <SelectItem value="+34">+34 (Spain)</SelectItem>
                          <SelectItem value="+506">+506 (Costa Rica)</SelectItem>
                          <SelectItem value="+57">+57 (Colombia)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        name="phoneDigits"
                        type="tel"
                        placeholder="(555) 000-0000"
                        className="flex-1 bg-secondary"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  {t('checkout.shipping')}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      name="address"
                      placeholder="123 Main St"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address2">Apartment, suite, etc. (optional)</Label>
                    <Input
                      id="address2"
                      name="address2"
                      placeholder="Apt 4B"
                      className="mt-1.5 bg-secondary"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="New York"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="NY"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      name="zip"
                      placeholder="10001"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select defaultValue="US" name="country">
                      <SelectTrigger className="mt-1.5 bg-secondary">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="CR">Costa Rica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  Secure White-Glove Payment
                </h2>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-4">
                  <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Personalized Setup
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You will finalize payment directly with the jeweler to ensure maximum security.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-lg border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  {t('checkout.review')}
                </h2>

                <div className="mt-4 space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs text-background">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {item.name}
                        </p>
                        {item.size && (
                          <p className="text-xs text-muted-foreground">
                            Size: {item.size}
                          </p>
                        )}
                        <p className="text-sm text-foreground">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                    <span className="text-foreground">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.shipping')}</span>
                    <span className="text-foreground">
                      {shipping === 0 ? 'Free' : formatPrice(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.tax')}</span>
                    <span className="text-foreground">{formatPrice(tax)}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{t('cart.total')}</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(finalTotal)}
                  </span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-6 w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    t('checkout.processing')
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit & Contact Jeweler
                    </>
                  )}
                </Button>

                <p className="mt-4 flex flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                  Your order details will be sent via encrypted WhatsApp to our concierge team.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

