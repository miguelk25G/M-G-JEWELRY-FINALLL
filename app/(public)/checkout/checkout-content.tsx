'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Lock, ShieldCheck, ShoppingBag, Tag, AlertCircle, HelpCircle } from 'lucide-react'
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
import { BrandConfig } from '@/lib/config/brand'
import {
  createStripeCheckoutSession,
  applyPromoCode,
  checkCartItemsCompatibility,
  type CartItemCompatibilityIssue,
  type CatalogItemDetails,
} from '@/lib/actions/checkout'
import { calculateOrderTotals } from '@/lib/config/pricing'
import { toast } from 'sonner'

export function CheckoutContent() {
  const { t, locale } = useTranslation()
  const { items, subtotal, updateItemSize } = useCartStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [promoInput, setPromoInput] = useState("")
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; type: string; value: number } | null>(null)
  const [compatibilityIssues, setCompatibilityIssues] = useState<CartItemCompatibilityIssue[]>([])
  const [catalogMap, setCatalogMap] = useState<Record<string, CatalogItemDetails>>({})
  const [deliveryState, setDeliveryState] = useState<string>("TX")
  const [deliveryCountry, setDeliveryCountry] = useState<string>("US")

  useEffect(() => {
    let active = true
    if (items.length === 0) {
      setCompatibilityIssues([])
      setCatalogMap({})
      return
    }
    const payload = items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      size: i.size,
    }))
    checkCartItemsCompatibility(payload).then((res) => {
      if (active) {
        setCompatibilityIssues(res.issues || [])
        setCatalogMap(res.catalogMap || {})
      }
    })
    return () => {
      active = false
    }
  }, [items])

  const rawSubtotal = subtotal()

  let discountAmount = 0
  if (appliedPromo) {
    if (appliedPromo.type === 'percentage') {
      discountAmount = rawSubtotal * (appliedPromo.value / 100)
    } else {
      discountAmount = Math.min(appliedPromo.value, rawSubtotal)
    }
  }

  const totals = calculateOrderTotals({
    subtotal: rawSubtotal,
    discountAmount,
    shippingAddress: {
      state: deliveryState,
      country: deliveryCountry,
    },
  })

  const handleRequestQuote = () => {
    const waNumber = BrandConfig.CONTACT.whatsappNumber.replace(/\D/g, "") || "15125760229"
    const itemsText = items.map((i) => `• ${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(2)})`).join("\n")
    const quoteMsg =
      locale === 'es'
        ? `✨ *Solicitud de Cotización Personalizada - M&G Jewelry*\n\n` +
          `Hola, deseo solicitar una cotización formal de impuestos y envío para entrega fuera de Texas.\n\n` +
          `*Destino:* ${deliveryState ? deliveryState.trim().toUpperCase() : 'Por definir'}, ${deliveryCountry}\n` +
          `*Artículos:*\n${itemsText}\n\n` +
          `*Subtotal de joyería:* $${totals.discountedSubtotal.toFixed(2)} USD\n` +
          `*Envío estándar estimado:* $${totals.shipping.toFixed(2)} USD\n` +
          `*Total provisional:* $${totals.total.toFixed(2)} USD\n\n` +
          `Por favor confírmenme la cotización final y los pasos para concretar la compra.`
        : `✨ *Custom Quote Request - M&G Jewelry*\n\n` +
          `Hello, I would like to request a formal sales tax and shipping quote for out-of-state delivery.\n\n` +
          `*Destination:* ${deliveryState ? deliveryState.trim().toUpperCase() : 'TBD'}, ${deliveryCountry}\n` +
          `*Items:*\n${itemsText}\n\n` +
          `*Jewelry Subtotal:* $${totals.discountedSubtotal.toFixed(2)} USD\n` +
          `*Estimated Shipping:* $${totals.shipping.toFixed(2)} USD\n` +
          `*Provisional Total:* $${totals.total.toFixed(2)} USD\n\n` +
          `Please provide the final quote and guidance to complete my purchase.`

    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(quoteMsg)}`, "_blank")
  }

  const handleApplyPromo = async () => {
    if (!promoInput) return
    setIsValidatingPromo(true)
    const toastId = toast.loading(locale === 'es' ? "Validando código..." : "Validating code...")

    try {
      const res = await applyPromoCode(promoInput)
      if (res.success && res.discountType && res.discountValue !== undefined && res.code) {
        setAppliedPromo({
          code: res.code,
          type: res.discountType,
          value: res.discountValue,
        })
        toast.success(locale === 'es' ? "Código aplicado con éxito" : "Discount code applied", { id: toastId })
      } else {
        toast.error(res.error || (locale === 'es' ? "Código inválido" : "Invalid code"), { id: toastId })
      }
    } catch (e) {
      toast.error(locale === 'es' ? "Error validando el código" : "Error validating discount code", { id: toastId })
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
    const toastId = toast.loading(
      locale === 'es' ? "Iniciando pago seguro en Stripe..." : "Initiating secure checkout..."
    )

    try {
      const formData = new FormData(e.currentTarget)
      if (appliedPromo) {
        formData.append("promoCode", appliedPromo.code)
      }

      const cartPayload = items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
      }))

      // Initiate Stripe Checkout session from the server
      const res = await createStripeCheckoutSession(formData, cartPayload)

      if (res.success && res.url) {
        // Keep the cart intact until payment is confirmed on Stripe.
        // Redirect client directly to the hosted Stripe Checkout URL.
        toast.success(
          locale === 'es' ? "Redirigiendo a Stripe..." : "Redirecting to Stripe...",
          { id: toastId }
        )
        window.location.href = res.url
      } else {
        const errorMsg = res.error || ""
        if (res.requiresQuote || errorMsg.includes('cotización') || errorMsg.includes('quote')) {
          toast.error(
            errorMsg || (locale === 'es' ? "Se requiere cotización para este destino." : "A custom quote is required for this destination."),
            { id: toastId, duration: 6000 }
          )
        } else if (
          errorMsg.includes('has no selectable sizes') ||
          errorMsg.includes('no tiene tallas')
        ) {
          // Identify EXCLUSIVELY the incompatible item by its cart ID and catalog verification
          let targetItemId = res.incompatibleCartItemId
          if (!targetItemId) {
            const incompatible = items.find((i) => {
              const cat = catalogMap[i.productId]
              return cat ? (!cat.admitsSizes && Boolean(i.size)) : false
            })
            targetItemId = incompatible?.id
          }

          if (targetItemId) {
            const affectedItem = items.find((i) => i.id === targetItemId)
            // Modify EXCLUSIVELY this line, strictly preserving all other lines, sizes and quantities
            updateItemSize(targetItemId, undefined)
            toast.error(
              locale === 'es'
                ? `El producto "${affectedItem?.name || ''}" no admite tallas. Se eliminó la talla exclusivamente de esta línea; las demás líneas y tallas se mantuvieron intactas. Pulsa "Pagar de forma segura" para continuar.`
                : `Product "${affectedItem?.name || 'item'}" does not admit sizes. Removed size exclusively from this line; all other lines and sizes remain intact. Please click "Pay securely" to continue.`,
              { id: toastId, duration: 6000 }
            )
          } else {
            toast.error(
              locale === 'es'
                ? "Uno de los productos no tiene tallas seleccionables. Revisa las líneas de tu pedido."
                : "A product in your cart has no selectable sizes. Please check your order lines.",
              { id: toastId }
            )
          }
        } else if (
          errorMsg.includes('Select an available size') ||
          errorMsg.includes('selecciona una talla')
        ) {
          toast.error(
            locale === 'es'
              ? "Por favor selecciona una talla disponible para el producto antes de pagar o vuelve a su ficha."
              : "Please select an available size for the product before paying or view its product page.",
            { id: toastId, duration: 6000 }
          )
        } else {
          toast.error(
            errorMsg || (locale === 'es' ? "Error al procesar el pago." : "Payment processing error."),
            { id: toastId }
          )
        }
        setIsProcessing(false)
      }
    } catch (err: any) {
      console.error("Checkout error:", err)
      toast.error(
        locale === 'es'
          ? "Ocurrió un error inesperado. Por favor intenta de nuevo."
          : "An unexpected error occurred. Please try again.",
        { id: toastId }
      )
      setIsProcessing(false)
    }
  }

  // Localized button text per requirements:
  // "Pay securely" in English and "Pagar de forma segura" in Spanish
  const payButtonText = locale === 'es' ? "Pagar de forma segura" : "Pay securely"

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
          {locale === 'es' ? "Checkout Seguro" : "Secure Checkout"}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          {locale === 'es'
            ? "Completa tus datos de envío para finalizar tu orden de joyería fina con total seguridad a través de Stripe."
            : "Enter your shipping and delivery information to complete your fine jewelry acquisition safely via Stripe."}
        </p>

        {compatibilityIssues.length > 0 && (
          <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>
                {locale === 'es'
                  ? "Atención: Ajuste requerido en las tallas del pedido"
                  : "Attention: Size adjustment needed in your order"}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {compatibilityIssues.map((issue) => {
                const affectedItem = items.find((i) =>
                  issue.cartItemId ? i.id === issue.cartItemId : i.productId === issue.productId
                )
                return (
                  <div
                    key={issue.cartItemId || issue.productId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded bg-background/50 p-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">
                        {issue.name || affectedItem?.name || issue.productId}:
                      </span>{' '}
                      <span className="text-muted-foreground">{issue.message}</span>
                    </div>
                    {issue.type === 'has_no_sizes' && affectedItem && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="self-start sm:self-auto h-7 text-xs"
                        onClick={() => {
                          updateItemSize(affectedItem.id, undefined)
                          toast.success(
                            locale === 'es'
                              ? "Talla removida de la línea incompatible"
                              : "Size removed from incompatible line"
                          )
                        }}
                      >
                        {locale === 'es' ? "Quitar talla" : "Remove size"}
                      </Button>
                    )}
                    {(issue.type === 'missing_size' || issue.type === 'invalid_size') && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="self-start sm:self-auto h-7 text-xs"
                        asChild
                      >
                        <Link href={`/product/${issue.slug || issue.productId}`}>
                          {locale === 'es' ? "Volver a la ficha" : "Go to product"}
                        </Link>
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
                        <SelectTrigger className="w-[110px] bg-secondary">
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
                      placeholder="123 Luxury Ave"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address2">{t('cartForm.apt')}</Label>
                    <Input
                      id="address2"
                      name="address2"
                      placeholder="Suite 400"
                      className="mt-1.5 bg-secondary"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">{t('cartForm.city')}</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Beverly Hills"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">{t('cartForm.state')}</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="TX"
                      value={deliveryState}
                      onChange={(e) => setDeliveryState(e.target.value)}
                      className="mt-1.5 bg-secondary uppercase"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">{t('cartForm.zip')}</Label>
                    <Input
                      id="zip"
                      name="zip"
                      placeholder="78701"
                      className="mt-1.5 bg-secondary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">{t('cartForm.country')}</Label>
                    <input type="hidden" name="country" value={deliveryCountry} />
                    <Select value={deliveryCountry} onValueChange={(val) => setDeliveryCountry(val)}>
                      <SelectTrigger className="mt-1.5 bg-secondary">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="CR">Costa Rica</SelectItem>
                        <SelectItem value="MX">Mexico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                  <div>
                    <h3 className="font-medium text-foreground">
                      {locale === 'es' ? "Garantía de Pago Seguro" : "Secure Payment Protection"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {locale === 'es'
                        ? "Procesado a través del entorno seguro y encriptado de Stripe con verificación 3D-Secure y seguro contra fraude."
                        : "Processed via Stripe's encrypted infrastructure with 3D-Secure card verification and fraud protection."}
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
                        {(() => {
                          const cat = catalogMap[item.productId]
                          const admitsSizes = cat?.admitsSizes
                          const availableSizes = cat?.availableSizes || []
                          const isStaleSize = cat && !admitsSizes && Boolean(item.size)
                          const isMissingOrInvalid =
                            cat && admitsSizes && (!item.size || !availableSizes.includes(item.size))

                          if (isStaleSize) {
                            return (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  {locale === 'es' ? "Talla no admitida:" : "Unselectable size:"} {item.size}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateItemSize(item.id, undefined)
                                    toast.success(
                                      locale === 'es'
                                        ? "Talla removida de la línea incompatible"
                                        : "Size removed from incompatible line"
                                    )
                                  }}
                                  className="text-[11px] text-amber-700 dark:text-amber-300 underline font-semibold hover:opacity-80"
                                >
                                  {locale === 'es' ? "Quitar talla" : "Remove size"}
                                </button>
                              </div>
                            )
                          }

                          if (isMissingOrInvalid) {
                            return (
                              <div className="mt-1 space-y-1">
                                <span className="text-xs text-destructive font-medium block">
                                  {item.size
                                    ? (locale === 'es'
                                        ? `Talla "${item.size}" no disponible`
                                        : `Size "${item.size}" unavailable`)
                                    : (locale === 'es'
                                        ? "Selecciona una talla"
                                        : "Size required")}
                                </span>
                                <div className="flex items-center gap-2">
                                  {availableSizes.length > 0 && (
                                    <select
                                      aria-label={locale === 'es' ? "Seleccionar talla" : "Select size"}
                                      className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground"
                                      value={item.size && availableSizes.includes(item.size) ? item.size : ""}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          updateItemSize(item.id, e.target.value)
                                          toast.success(
                                            locale === 'es'
                                              ? `Talla actualizada a ${e.target.value}`
                                              : `Size updated to ${e.target.value}`
                                          )
                                        }
                                      }}
                                    >
                                      <option value="" disabled>
                                        {locale === 'es' ? "Elegir talla..." : "Choose size..."}
                                      </option>
                                      {availableSizes.map((sz) => (
                                        <option key={sz} value={sz}>
                                          {sz}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  <Link
                                    href={`/product/${cat?.slug || item.productId}`}
                                    className="text-[11px] text-primary underline hover:opacity-80"
                                  >
                                    {locale === 'es' ? "Ver ficha" : "View product"}
                                  </Link>
                                </div>
                              </div>
                            )
                          }

                          if (item.size) {
                            return (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {locale === 'es' ? "Talla:" : "Size:"} {item.size}
                              </p>
                            )
                          }

                          return null
                        })()}
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
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
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
                    <span className="flex items-center gap-2">
                      <Tag className="w-3 h-3" /> {appliedPromo.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedPromo(null)}
                      className="text-xs underline hover:text-green-500"
                    >
                      {t('cartForm.remove')}
                    </button>
                  </div>
                )}

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                    <span className="text-foreground">{formatPrice(totals.rawSubtotal)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-green-500">
                      <span>{t('cartForm.discount')}</span>
                      <span>-{formatPrice(totals.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.shipping')}</span>
                    <span className="text-foreground">
                      {totals.shipping === 0 ? t('cartForm.free') : formatPrice(totals.shipping)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {locale === 'es' ? "Impuesto sobre ventas" : "Sales Tax"}
                      </span>
                      <span className="text-foreground text-xs">
                        {locale === 'es' ? "Calculado en Checkout (Stripe Tax)" : "Calculated at checkout (Stripe Tax)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {locale === 'es'
                        ? "Calculado automáticamente por Stripe Tax según tu dirección exacta de entrega en EE. UU."
                        : "Calculated automatically by Stripe Tax based on your exact US delivery destination."}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{t('cart.total')}</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(totals.total)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground text-right mt-0.5">
                  {locale === 'es' ? "+ impuestos aplicables en Stripe" : "+ applicable tax in Stripe"}
                </p>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-6 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide shadow-md"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    t('checkout.processing')
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      {payButtonText}
                    </>
                  )}
                </Button>

                <div className="mt-4 pt-3 border-t border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    {locale === 'es'
                      ? "¿Deseas un pedido personalizado, grabado especial o alta joyería a medida?"
                      : "Looking for bespoke designs, custom engravings, or high jewelry quotes?"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium"
                    onClick={handleRequestQuote}
                  >
                    <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                    {locale === 'es'
                      ? "Solicitar cotización personalizada"
                      : "Request custom quote"}
                  </Button>
                </div>

                <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  {locale === 'es'
                    ? "Transacción encriptada de 256 bits mediante Stripe"
                    : "Encrypted 256-bit transaction via Stripe"}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
