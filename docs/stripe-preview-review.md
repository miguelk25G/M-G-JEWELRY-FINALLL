# Stripe Preview corrections — 2026-11-06

Scope: `feat/stripe-checkout`, Preview only. No production release.

## Changes

- Webhook rejects missing secret (503), missing/invalid signature (400), without writes. Checkout refuses new reservations while signing secret is absent.
- Shared payment service validates stored order, unique Checkout session, total in cents, currency and payment status. Success page is read-only; authenticated admin reconciliation uses the same service.
- New Order fields track session, PaymentIntent, payment state, reservation state and cumulative refund cents. StripeEvent primary key is the durable event deduplication key. Serializable database transactions retry conflicts; conditional reservation transitions prevent repeated release.
- Cancellation expires an open session in Stripe first; if payment wins, reconcile payment without returning stock. Ambiguous/in-progress cancellation retains stock and displays an unconfirmed state.
- Attempt failures keep stock reserved. Terminal asynchronous failure and expiration release once. Partial/full refunds update financial state only, never stock or fulfillment.
- Size selection is required when sizes exist; invalid selections and malformed configuration fail.
- Admin no longer has a separate stock-return path; Stripe orders cannot be manually marked paid. Partial refunds are visible.
- Preview requires TEST database settings and test Stripe credentials. Mere presence of TEST variables no longer switches production databases.

## Validation and limits

`pnpm test:payments`: 15 passing contract tests, 1 PostgreSQL integration test skipped.
Contract tests execute the production payment service and HTTP handler, with real Stripe SDK signature verification. Database adapter and Stripe network calls are simulated. Simultaneous calls test the service contract, not PostgreSQL locking itself.

The PostgreSQL test is opt-in with `TEST_INTEGRATION_DATABASE_URL`, pointing to a disposable database already using the current schema. It inserts uniquely named fixtures and removes only those fixtures. It still simulates Stripe transport. Not executed in this review: no dedicated integration credentials were available locally.

Local Next build with Webpack passed using deliberately unreachable dummy database URLs; this proves compilation, not database connectivity. TypeScript check still reports pre-existing collections page errors and the auth route exporting `authOptions`; project currently ignores type errors during build. No real Stripe payment, browser checkout or external end-to-end verification has been performed.

## Required Preview setup

- `stripe_secret_key`: test key, Preview only.
- `stripe_webhook_secret`: endpoint signing secret, Preview only; absent at inspection. Store sensitively and redeploy.
- `TEST_PRISMA_DATABASE_URL`, `TEST_POSTGRES_URL`: required, Preview-only isolated database.
- Configure a strong `NEXTAUTH_SECRET` (also absent at inspection); check admin authentication before launch.
- Webhook `/api/webhooks/stripe` must be reachable by Stripe. Vercel SSO protection can block deliveries; verify delivery responses without disabling unrelated protection.
- Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, payment_intent.payment_failed, charge.refunded.
- Existing build uses `prisma db push`; the added fields are additive and apply to TEST database in Preview. No production migration was performed.

## Remaining operational limits before launch

- Pre-correction orders have no session/reservation fields. Do not guess their reservations or backfill payment state blindly; reconcile old test sessions manually and use new orders for testing.
- A network error during session creation or a subsequent database failure can leave a reserved order without a saved session link. Stock deliberately stays reserved because Stripe may have accepted the request. These require manual reconciliation; do not blindly restock. Creation uses an order-specific Stripe idempotency key.
- The existing 8% estimated tax and shipping policy still need business/tax validation. No production tax claim is made.
- Real test-mode purchase, rejection/retry, concurrent final-item purchase, webhook retries and admin verification remain required. Build Ready is not proof of those flows.
