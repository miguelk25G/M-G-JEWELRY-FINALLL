'use client'

import Link from 'next/link'
import { ShoppingBag, ArrowLeft, RefreshCw, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/locale-context'
import { useCartStore } from '@/lib/store/cart-store'

export function CheckoutCancelContent({ confirmed }: { confirmed: boolean }) {
  const { locale } = useTranslation()
  const { itemCount } = useCartStore()
  const count = itemCount()

  if (!confirmed) return <div className="mx-auto max-w-xl py-20 text-center"><h1>{locale === "es" ? "Estamos verificando el estado de tu pago" : "Checking your payment status"}</h1><p>{locale === "es" ? "La cancelación no está confirmada. No repitas el pago; contacta soporte para verificar tu pedido." : "Cancellation is not confirmed. Do not pay again; contact support to check your order."}</p><Link href="/contact">{locale === "es" ? "Contactar soporte" : "Contact support"}</Link></div>

  return (
    <div className="py-16 lg:py-24">
      <div className="mx-auto max-w-xl px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 mb-6">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {locale === 'es' ? "Pago Cancelado o Interrumpido" : "Checkout Cancelled"}
        </span>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl">
          {locale === 'es' ? "Tu compra no fue procesada" : "Your purchase was not completed"}
        </h1>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base">
          {locale === 'es'
            ? "No se ha realizado ningún cobro a tu tarjeta. Tu carrito de compras se mantiene guardado exactamente como lo dejaste para que puedas intentarlo nuevamente cuando desees."
            : "No charges were made to your account. Your cart has been safely preserved so you can resume your acquisition at your convenience."}
        </p>

        {count > 0 && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground">
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
            {locale === 'es'
              ? `${count} ${count === 1 ? 'artículo conservado' : 'artículos conservados'} en tu carrito`
              : `${count} item(s) preserved in your cart`}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto gap-2">
            <Link href="/checkout">
              <RefreshCw className="h-4 w-4" />
              {locale === 'es' ? "Volver al Checkout" : "Return to Checkout"}
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="w-full sm:w-auto gap-2">
            <Link href="/collections">
              <ArrowLeft className="h-4 w-4" />
              {locale === 'es' ? "Ver Colecciones" : "Browse Collections"}
            </Link>
          </Button>
        </div>

        <div className="mt-12 rounded-lg border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5 font-medium text-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {locale === 'es' ? "¿Prefieres atención personalizada?" : "Prefer personal guidance?"}
          </p>
          <p className="mt-1">
            {locale === 'es'
              ? "Nuestro equipo White-Glove está disponible para coordinar métodos de pago alternativos o resolver tus consultas de manera directa."
              : "Our White-Glove team is at your service to assist with custom acquisition and personalized assistance."}
          </p>
          <Link
            href="/white-glove"
            className="mt-2 inline-block text-primary underline hover:text-primary/80 font-medium"
          >
            {locale === 'es' ? "Consultar con White-Glove" : "Connect with White-Glove"}
          </Link>
        </div>
      </div>
    </div>
  )
}
