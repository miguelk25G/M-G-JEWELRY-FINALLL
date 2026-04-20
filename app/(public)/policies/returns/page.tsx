"use client"

import { useTranslation } from "@/i18n/locale-context"

export default function ReturnsPolicyPage() {
  const { locale } = useTranslation()

  return (
    <div className="min-h-screen py-24 px-4 bg-background">
      <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1 className="text-4xl font-serif font-bold mb-8">
          {locale === 'es' ? 'Devoluciones y Cambios' : 'Returns & Exchanges Policy'}
        </h1>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Ventana de Devolución' : 'Return Window'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Aceptamos devoluciones dentro de los 14 días posteriores a la entrega.'
                : 'We accept returns within 14 days of delivery.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Elegibilidad' : 'Eligibility'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Los artículos deben estar sin uso, en su condición original y devueltos con su empaque original intacto.'
                : 'Items must be unworn, in original condition, and returned with original packaging.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Artículos No Retornables' : 'Non-Returnable Items'}
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{locale === 'es' ? 'Artículos personalizados, grabados o redimensionados.' : 'Custom, engraved, or resized items.'}</li>
              <li>{locale === 'es' ? 'Artículos en rebaja o venta final.' : 'Final sale items.'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Cómo Iniciar una Devolución' : 'How to Start a Return'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Contáctenos por WhatsApp o Instagram con su número de orden. Una vez el artículo es recibido, lo inspeccionaremos antes de aprobar un reembolso o cambio.'
                : 'Contact us via WhatsApp or Instagram with your order number. Once the item is received, we inspect it before approving a refund or exchange.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Reembolsos' : 'Refunds'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Los reembolsos aprobados se emitirán al método de pago original inmediatamente después de la inspección.'
                : 'Approved refunds are issued to the original payment method after inspection.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Envío de Devolución' : 'Return Shipping'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'El costo del envío de devolución es generalmente responsabilidad del cliente, excepto en casos donde se confirme un defecto de fábrica o si se envió un artículo incorrecto.'
                : 'Return shipping is typically the customer’s responsibility, except in cases of confirmed manufacturing defects or incorrect items shipped.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
