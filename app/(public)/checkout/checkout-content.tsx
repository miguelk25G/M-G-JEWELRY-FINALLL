'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Send, ShieldCheck, ShoppingBag, Tag } from 'lucide-react'
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
import { submitConciergeOrder, applyPromoCode } from '@/lib/actions/checkout'
import { toast } from 'sonner'

export function CheckoutContent() {
  const { t } = useTranslation()
  const { items, subtotal, clearCart } = useCartStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [promoInput, setPromoInput] = useState("")
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<{code: string, type: string, value: number} | null>(null)

  const rawSubtotal = subtotal()
  
  let discountAmount = 0
  if (appliedPromo) {
    if (appliedPromo.type === 'percentage') {
      discountAmount = rawSubtotal * (appliedPromo.value / 100)
    } else {
      discountAmount = appliedPromo.value
    }
  }

  const discountedSubtotal = Math.max(0, rawSubtotal - discountAmount)
  const shipping = discountedSubtotal > 500 ? 0 : 25
  const tax = discountedSubtotal * 0.08
  const finalTotal = discountedSubtotal + shipping + tax

  const handleApplyPromo = async () => {
    if (!promoInput) return
    setIsValidatingPromo(true)
    const toastId = toast.loading("Validando código...")
    
    try {
      const res = await applyPromoCode(promoInput)
      if (res.success) {
        setAppliedPromo({
          code: res.code,
          type: res.discountType,
          value: res.discountValue
        })
        toast.success("Código aplicado", { id: toastId })
      } else {
        toast.error(res.error, { id: toastId })
      }
    } catch (e) {
      toast.error("Error validando el código", { id: toastId })
    } finally {
      setIsValidatingPromo(false)
    }
  }

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
            <Button className="mt-6" asChild>
              <Link href="/collections">{t('cart.continueShopping')}</Link>
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
      if (appliedPromo) {
        formData.append("promoCode", appliedPromo.code)
      }

      const res = await submitConciergeOrder(formData, items)
      
      if (res.success) {
        clearCart()
        window.location.href = res.waLink
      } else {
        alert("Backend Database Error: " + res.error)
        setIsProcessing(false)
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
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('cart.goToCart')}
        </Link>

        <h1 className="mt-6 font-serif text-3xl font-bold text-foreground lg:text-4xl">
          {t('cartForm.completeRequest')}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          {t('cartForm.requestDesc')}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  {t('checkout.contact')}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">{t('cartForm.email')}</Label>
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
                    <Label htmlFor="firstName">{t('cartForm.firstName')}</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('cartForm.lastName')}</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="phone">{t('cartForm.phone')}</Label>
                    <div className="mt-1.5 flex gap-2">
                      <Select defaultValue="+1" name="phonePrefix">
                        <SelectTrigger className="w-[100px] bg-secondary">
                          <SelectValue placeholder="Code" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="+1">+1 (US)</SelectItem>
                          <SelectItem value="+44">+44 (UK)</SelectItem>
                          <SelectItem value="+52">+52 (MX)</SelectItem>
                          <SelectItem value="+34">+34 (ES)</SelectItem>
                          <SelectItem value="+506">+506 (CR)</SelectItem>
                          <SelectItem value="+57">+57 (CO)</SelectItem>
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

              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  {t('checkout.shipping')}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">{t('cartForm.street')}</Label>
                    <Input
                      id="address"
                      name="address"
                      placeholder="123 Main St"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address2">{t('cartForm.apt')}</Label>
                    <Input
                      id="address2"
                      name="address2"
                      placeholder="Apt 4B"
                      className="mt-1.5 bg-secondary"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">{t('cartForm.city')}</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="New York"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">{t('cartForm.state')}</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="NY"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">{t('cartForm.zip')}</Label>
                    <Input
                      id="zip"
                      name="zip"
                      placeholder="10001"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">{t('cartForm.country')}</Label>
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

              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  {t('cartForm.securePayment')}
                </h2>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-4">
                  <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t('cartForm.personalizedSetup')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('cartForm.personalizedDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

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

                <div className="flex gap-2 mb-4">
                  <Input 
                    placeholder={t('cartForm.discountCode')} 
                    value={promoInput} 
                    onChange={e => setPromoInput(e.target.value.toUpperCase())} 
                    disabled={!!appliedPromo} 
                    className="bg-secondary"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleApplyPromo}
                    disabled={!!appliedPromo || !promoInput || isValidatingPromo}
                  >
                    {appliedPromo ? t('cartForm.applied') : t('cartForm.apply')}
                  </Button>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between items-center text-sm mb-4 text-green-600 bg-green-50/10 border border-green-500/20 p-2 rounded">
                    <span className="flex items-center gap-2"><Tag className="w-3 h-3"/> {appliedPromo.code}</span>
                    <button type="button" onClick={() => setAppliedPromo(null)} className="text-xs underline hover:text-green-500">{t('cartForm.remove')}</button>
                  </div>
                )}

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                    <span className="text-foreground">{formatPrice(rawSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-500">
                      <span>{t('cartForm.discount')}</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.shipping')}</span>
                    <span className="text-foreground">
                      {shipping === 0 ? t('cartForm.free') : formatPrice(shipping)}
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
                      {t('cartForm.submit')}
                    </>
                  )}
                </Button>

              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
