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

  const result = sessionId ? await cancelStripeCheckout(sessionId) : null
  return <CheckoutCancelContent confirmed={result?.success === true} />
}
