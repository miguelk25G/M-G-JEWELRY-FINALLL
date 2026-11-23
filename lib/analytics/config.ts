/**
 * Google Analytics 4 configuration for M&G Jewelry (https://www.mngjewelry.com).
 *
 * Verified tag mapping (confirmed against Google Tag servers):
 * - Google tag container ID shown during setup: GTM-N4XKV74N
 * - Connected GA4 Web Stream Measurement ID:    G-TXQ580DX7M
 *
 * Both `gtag/js?id=G-TXQ580DX7M` and `gtag/js?id=GTM-N4XKV74N` resolve to the
 * exact same Google tag resource targeting GA4 destination `G-TXQ580DX7M`.
 * We load ONLY the single GA4 Measurement ID via the official `gtag.js` snippet
 * so there is never a duplicate tag installation.
 */

export const DEFAULT_GA_MEASUREMENT_ID = 'G-TXQ580DX7M' as const
export const LINKED_GOOGLE_TAG_ID = 'GTM-N4XKV74N' as const

export const ANALYTICS_CONSENT_STORAGE_KEY = 'mg_analytics_consent' as const
export const ANALYTICS_CONSENT_COOKIE_NAME = 'mg_analytics_consent' as const
export const ANALYTICS_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year

/**
 * ISO 3166-1 alpha-2 region codes where analytics cookies require prior opt-in
 * under Google Consent Mode v2 (EEA, UK, and Switzerland).
 */
export const EEA_UK_CH_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU',
  'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'GB', 'CH',
] as const

const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,16}$/

/**
 * Resolves and validates the GA4 Measurement ID (`G-...`).
 * Never accepts a `GTM-...` container ID as a GA4 Measurement ID.
 */
export function resolveGaMeasurementId(
  envValue: string | undefined = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
): string {
  const candidate = envValue?.trim()
  if (candidate && GA4_MEASUREMENT_ID_PATTERN.test(candidate)) {
    return candidate
  }
  return DEFAULT_GA_MEASUREMENT_ID
}

export const GA_MEASUREMENT_ID = resolveGaMeasurementId()

/**
 * Determines whether GA4 scripts should render in the current environment.
 * - Vercel Production: always enabled.
 * - Vercel Preview: disabled by default to prevent QA traffic from polluting
 *   live analytics, unless `NEXT_PUBLIC_GA_ALLOW_PREVIEW="true"` is set.
 * - Local development/start: enabled so developers can verify tag loading and
 *   SPA page_view behavior before deployment (can be disabled via
 *   `NEXT_PUBLIC_GA_DISABLED="true"`).
 */
export function isGaEnabledForEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NEXT_PUBLIC_GA_DISABLED === 'true') {
    return false
  }
  const vercelEnv = env.VERCEL_ENV || env.NEXT_PUBLIC_VERCEL_ENV
  if (vercelEnv === 'preview' && env.NEXT_PUBLIC_GA_ALLOW_PREVIEW !== 'true') {
    return false
  }
  return Boolean(resolveGaMeasurementId(env.NEXT_PUBLIC_GA_MEASUREMENT_ID))
}

/**
 * Public storefront paths are tracked; internal admin paths are excluded.
 */
export function isExcludedAnalyticsPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname === '/admin' || pathname.startsWith('/admin/')
}
