import Stripe from 'stripe'

// Vercel Preview strictly injects `stripe_secret_key` in lowercase.
// Support uppercase fallback for other environments.
const stripeSecretKey =
  process.env.stripe_secret_key || process.env.STRIPE_SECRET_KEY

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia' as any,
      typescript: true,
      appInfo: {
        name: 'M&G Jewelry Checkout',
        version: '1.0.0',
      },
    })
  : null

export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      'Stripe secret key is missing. Ensure stripe_secret_key or STRIPE_SECRET_KEY is configured in your environment.'
    )
  }
  return stripe
}
