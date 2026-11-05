import { Metadata } from 'next'
import { verifyStripePayment } from '@/lib/actions/checkout'
import { CheckoutSuccessContent } from './success-content'

export const metadata: Metadata = {
  title: 'Payment Confirmed - M&G Jewelry',
  description: 'Your order and payment have been confirmed via Stripe.',
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const resolvedParams = await searchParams
  const sessionId = resolvedParams.session_id

  if (!sessionId) {
    return (
      <CheckoutSuccessContent
        error="No se encontró una sesión de pago válida. Por favor verifica tus pedidos o contacta a soporte."
      />
    )
  }

  // Retrieve confirmation directly from Stripe API
  const verification = await verifyStripePayment(sessionId)

  if (!verification.success || !verification.order) {
    return (
      <CheckoutSuccessContent
        error={verification.error || "No pudimos verificar la confirmación del pago con Stripe."}
      />
    )
  }

  return <CheckoutSuccessContent order={verification.order as any} />
}
