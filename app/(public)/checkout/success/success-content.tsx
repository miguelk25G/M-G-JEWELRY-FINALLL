'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Package, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/lib/store/cart-store'
import { useTranslation } from '@/i18n/locale-context'
import { formatPrice } from '@/lib/format'

interface OrderData {
  id: string
  orderNumber: string
  customerName: string
  email: string
  total: number
  subtotal: number
  shipping: number
  tax: number
  discount: number
  items: Array<{
    id: string
    name: string
    quantity: number
    price: number
    size?: string | null
  }>
  shippingAddress: any
  createdAt: any
}

export function CheckoutSuccessContent({
  order,
  error,
}: {
  order?: OrderData
  error?: string
}) {
  const { t, locale } = useTranslation()
  const { clearCart } = useCartStore()

  // Crucial: Clear cart ONLY after verified payment confirmation from Stripe
  useEffect(() => {
    if (order) {
      clearCart()
    }
  }, [order, clearCart])

  if (error || !order) {
    return (
      <div className="py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 mb-6">
            <Package className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            {locale === 'es' ? "Verificación de Pago en Curso" : "Payment Verification Pending"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {error ||
              (locale === 'es'
                ? "Estamos confirmando el estado de tu transacción con Stripe. Si tu pago fue completado, recibirás la confirmación por correo en breve."
                : "We are confirming the transaction with Stripe. If your payment was completed, you will receive a confirmation email shortly.")}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild>
              <Link href="/">{locale === 'es' ? "Volver al Inicio" : "Return to Home"}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contact">{locale === 'es' ? "Contactar Soporte" : "Contact Support"}</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const street = order.shippingAddress?.street || order.shippingAddress || ""
  const city = order.shippingAddress?.city || ""
  const state = order.shippingAddress?.state || ""
  const zip = order.shippingAddress?.zip || ""
  const country = order.shippingAddress?.country || ""

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500 mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">
              {locale === 'es' ? "Pago Confirmado por Stripe" : "Payment Confirmed via Stripe"}
            </span>
            <h1 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl">
              {locale === 'es' ? "¡Gracias por tu compra!" : "Thank You For Your Order!"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {locale === 'es'
                ? `Hemos recibido tu pago de forma segura y comenzado a preparar tus piezas exclusivas.`
                : `Your payment was successfully processed. We have begun preparing your bespoke fine jewelry pieces.`}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-mono font-medium">
              <span>{locale === 'es' ? "No. de Orden:" : "Order #:"}</span>
              <span className="text-primary">{order.orderNumber}</span>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Purchased Items */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4">
              {locale === 'es' ? "Piezas Adquiridas" : "Acquired Pieces"}
            </h2>
            <div className="divide-y divide-border rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
              {order.items.map((it) => (
                <div key={it.id} className="pt-3 first:pt-0 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium text-foreground">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {locale === 'es' ? "Cantidad:" : "Qty:"} {it.quantity}
                      {it.size && ` | ${locale === 'es' ? "Talla:" : "Size:"} ${it.size}`}
                    </p>
                  </div>
                  <span className="font-semibold text-foreground">
                    {formatPrice(it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="mt-6 space-y-2 text-sm bg-secondary/20 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{locale === 'es' ? "Subtotal" : "Subtotal"}</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{locale === 'es' ? "Descuento" : "Discount"}</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{locale === 'es' ? "Envío asegurado" : "Insured Shipping"}</span>
              <span>{order.shipping === 0 ? (locale === 'es' ? "Gratis" : "Free") : formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{locale === 'es' ? "Impuestos" : "Estimated Tax"}</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-base">
              <span>{locale === 'es' ? "Total Pagado" : "Total Paid"}</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Shipping & Delivery Details */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-1">
                {locale === 'es' ? "Dirección de Entrega" : "Delivery Destination"}
              </h3>
              <p className="text-muted-foreground">{order.customerName}</p>
              <p className="text-muted-foreground">{street}</p>
              {(city || state || zip) && (
                <p className="text-muted-foreground">
                  {city}, {state} {zip}
                </p>
              )}
              {country && <p className="text-muted-foreground">{country}</p>}
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-1">
                {locale === 'es' ? "Contacto del Pedido" : "Order Contact"}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {locale === 'es'
                  ? `Correo registrado para notificaciones y seguimiento:`
                  : `Registered email for order tracking and concierge inquiries:`}
              </p>
              <p className="font-medium text-foreground mt-1">{order.email}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {locale === 'es'
                  ? "Conserva tu número de orden para cualquier consulta sobre tu adquisición."
                  : "Please keep your order number for reference with our concierge team."}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600">
                <ShieldCheck className="h-4 w-4" />
                <span>{locale === 'es' ? "Envío asegurado en preparación" : "Insured delivery in preparation"}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2">
              <Link href="/collections">
                {locale === 'es' ? "Seguir Explorando" : "Continue Exploring"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
