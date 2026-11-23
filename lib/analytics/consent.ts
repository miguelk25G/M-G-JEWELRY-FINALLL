import {
  ANALYTICS_CONSENT_COOKIE_NAME,
  ANALYTICS_CONSENT_MAX_AGE_SECONDS,
  ANALYTICS_CONSENT_STORAGE_KEY,
} from './config'

export type AnalyticsConsentChoice = 'granted' | 'denied'

export const CONSENT_OPEN_EVENT = 'mg:open-cookie-preferences'

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return null
}

/**
 * Reads the persisted analytics consent choice from localStorage or first-party cookie.
 * Returns `null` if the visitor has not made an explicit choice yet.
 */
export function getStoredAnalyticsConsent(): AnalyticsConsentChoice | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
    if (stored === 'granted' || stored === 'denied') {
      return stored
    }
  } catch {
    // Ignore storage access errors in restricted privacy modes
  }

  const cookieVal = readCookieValue(ANALYTICS_CONSENT_COOKIE_NAME)
  if (cookieVal === 'granted' || cookieVal === 'denied') {
    return cookieVal
  }

  return null
}

/**
 * Detects whether the browser advertises Global Privacy Control (GPC),
 * which is honored under US state privacy laws (e.g. Texas TDPSA, CCPA/CPRA).
 */
export function isGlobalPrivacyControlEnabled(): boolean {
  if (typeof navigator === 'undefined') return false
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}

/**
 * Persists the visitor's consent choice and immediately notifies Google Consent Mode v2.
 */
export function saveAnalyticsConsent(choice: AnalyticsConsentChoice): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, choice)
  } catch {
    // Ignore storage quota/privacy errors
  }

  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${ANALYTICS_CONSENT_COOKIE_NAME}=${choice}; Path=/; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
  } catch {
    // Ignore cookie errors
  }

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: choice,
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  }
}

/**
 * Triggers the cookie preferences banner to re-open from anywhere (e.g. Footer link).
 */
export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT))
}
