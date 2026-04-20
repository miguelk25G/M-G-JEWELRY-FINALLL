"use client"

import { useTranslation } from "@/i18n/locale-context"

export default function ShippingPolicyPage() {
  const { locale } = useTranslation()

  return (
    <div className="min-h-screen py-24 px-4 bg-background">
      <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1 className="text-4xl font-serif font-bold mb-8">
          {locale === 'es' ? 'Política de Envíos' : 'Shipping Policy'}
        </h1>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Tiempo de Procesamiento' : 'Processing Time'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Los pedidos de artículos en stock se procesan dentro de 1 a 7 días hábiles. Los artículos hechos a pedido (si aplica) pueden tardar de 2 a 8 semanas — el cronograma estimado se mostrará en la página del producto.'
                : 'In-stock orders are processed within 1–7 business days. Made-to-order items (if applicable) can take 2–8 weeks — the estimated timeline will be shown on the product page when relevant.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Rastreo' : 'Tracking'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Todos los envíos incluyen número de rastreo una vez que su pedido es despachado.'
                : 'All shipments include tracking once your order ships.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Envío Asegurado / Firma Requerida' : 'Insured Shipping / Signature'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Para compras mayores a $650, requerimos confirmación de firma y seguro de envío completo para garantizar la máxima seguridad en la entrega.'
                : 'For purchases over $650, we require signature confirmation and full shipping insurance for security.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Precisión de la Dirección' : 'Address Accuracy'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Por favor, revise cuidadosamente su dirección de envío en la pantalla de pago. No nos hacemos responsables por retrasos o pérdidas causadas por una dirección incorrecta proporcionada por el cliente.'
                : 'Please double-check your shipping address at checkout. We are not responsible for delays or loss caused by an incorrect address provided by the customer.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Problemas de Entrega' : 'Delivery Issues'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Si el rastreo indica "entregado" pero usted no ha recibido el paquete, contáctenos dentro de las 48 horas para que podamos brindarle asistencia de inmediato.'
                : 'If tracking shows "delivered" but you didn’t receive it, contact us within 48 hours so we can help.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
