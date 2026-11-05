import { Metadata } from 'next'
import { cancelStripeCheckout } from '@/lib/actions/checkout'
import { CheckoutCancelContent } from './cancel-content'

export const metadata: Metadata = {
  title: 'Checkout Cancelled - M&G Jewelry',
  description: 'Your checkout was cancelled. Your cart has been preserved.',
}

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const resolvedParams = await searchParams
  const sessionId = resolvedParams.session_id

  // If a session ID was provided on cancel, release the reserved stock immediately
  if (sessionId) {
    await cancelStripeCheckout(sessionId)
  }

  return <CheckoutCancelContent />
}
