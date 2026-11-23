import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_GA_MEASUREMENT_ID,
  isExcludedAnalyticsPath,
  isGaEnabledForEnvironment,
  resolveGaMeasurementId,
} from '../lib/analytics/config'
import {
  ensureGaConfiguredOnPublicEntry,
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackViewItem,
} from '../lib/analytics/ga4'
import {
  getStoredAnalyticsConsent,
  isGlobalPrivacyControlEnabled,
  saveAnalyticsConsent,
} from '../lib/analytics/consent'

function createMockBrowser(pathname = '/') {
  const storage = new Map<string, string>()
  const session = new Map<string, string>()
  const gtagCalls: unknown[][] = []
  let cookieJar = ''

  const mockWindow: any = {
    location: { pathname, protocol: 'https:' },
    dataLayer: [],
    gtag: (...args: unknown[]) => {
      gtagCalls.push(args)
    },
    localStorage: {
      getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
    sessionStorage: {
      getItem: (k: string) => (session.has(k) ? session.get(k)! : null),
      setItem: (k: string, v: string) => session.set(k, v),
      removeItem: (k: string) => session.delete(k),
    },
    dispatchEvent: () => true,
  }

  const mockDocument: any = {
    get cookie() {
      return cookieJar
    },
    set cookie(val: string) {
      const [pair] = val.split(';')
      const [k, v] = pair.split('=')
      const entries = cookieJar
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean)
        .filter((c) => !c.startsWith(`${k}=`))
      entries.push(`${k}=${v}`)
      cookieJar = entries.join('; ')
    },
  }

  ;(globalThis as any).window = mockWindow
  ;(globalThis as any).document = mockDocument
  Object.defineProperty(globalThis, 'navigator', {
    value: { globalPrivacyControl: false },
    configurable: true,
    writable: true,
  })

  return { mockWindow, mockDocument, gtagCalls, storage, session }
}

function cleanupMockBrowser() {
  delete (globalThis as any).window
  delete (globalThis as any).document
}

test('resolveGaMeasurementId accepts valid G- IDs and rejects GTM- IDs', () => {
  assert.equal(resolveGaMeasurementId(undefined), DEFAULT_GA_MEASUREMENT_ID)
  assert.equal(resolveGaMeasurementId('G-TXQ580DX7M'), 'G-TXQ580DX7M')
  assert.equal(resolveGaMeasurementId('G-ABCDEF1234'), 'G-ABCDEF1234')
  // Never mistake a GTM container ID for a GA4 Measurement ID
  assert.equal(resolveGaMeasurementId('GTM-N4XKV74N'), DEFAULT_GA_MEASUREMENT_ID)
  assert.equal(resolveGaMeasurementId('invalid-id'), DEFAULT_GA_MEASUREMENT_ID)
})

test('isGaEnabledForEnvironment enables production, skips preview by default, and respects disable flag', () => {
  assert.equal(isGaEnabledForEnvironment({ VERCEL_ENV: 'production' } as any), true)
  assert.equal(isGaEnabledForEnvironment({ VERCEL_ENV: 'preview' } as any), false)
  assert.equal(
    isGaEnabledForEnvironment({ VERCEL_ENV: 'preview', NEXT_PUBLIC_GA_ALLOW_PREVIEW: 'true' } as any),
    true
  )
  assert.equal(
    isGaEnabledForEnvironment({ VERCEL_ENV: 'production', NEXT_PUBLIC_GA_DISABLED: 'true' } as any),
    false
  )
})

test('isExcludedAnalyticsPath excludes admin routes and includes all public storefront pages', () => {
  assert.equal(isExcludedAnalyticsPath('/admin'), true)
  assert.equal(isExcludedAnalyticsPath('/admin/orders'), true)
  assert.equal(isExcludedAnalyticsPath('/admin/login'), true)

  for (const publicPath of [
    '/',
    '/product/cuban-link-chain',
    '/collections',
    '/collections/chains',
    '/white-glove',
    '/contact',
    '/cart',
    '/checkout',
  ]) {
    assert.equal(isExcludedAnalyticsPath(publicPath), false, `Expected ${publicPath} to be tracked`)
  }
})

test('consent persistence updates Consent Mode v2 and respects GPC', () => {
  const { gtagCalls } = createMockBrowser('/')
  try {
    assert.equal(getStoredAnalyticsConsent(), null)
    assert.equal(isGlobalPrivacyControlEnabled(), false)

    saveAnalyticsConsent('denied')
    assert.equal(getStoredAnalyticsConsent(), 'denied')
    assert.equal(gtagCalls.length, 1)
    assert.deepEqual(gtagCalls[0], [
      'consent',
      'update',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ])

    saveAnalyticsConsent('granted')
    assert.equal(getStoredAnalyticsConsent(), 'granted')
    assert.equal((gtagCalls[1][2] as any).analytics_storage, 'granted')
  } finally {
    cleanupMockBrowser()
  }
})

test('ecommerce helpers dispatch valid GA4 payloads and strictly guard purchase events', () => {
  const { gtagCalls } = createMockBrowser('/product/diamond-tennis-bracelet')
  try {
    const item = {
      item_id: 'MG-TB-001',
      item_name: '14K Diamond Tennis Bracelet',
      item_category: 'Bracelets',
      price: 2450,
      quantity: 1,
    }

    assert.equal(trackViewItem({ value: 2450, items: [item] }), true)
    assert.equal(trackAddToCart({ value: 2450, items: [item] }), true)
    assert.equal(trackBeginCheckout({ value: 2450, items: [item] }), true)

    assert.equal(gtagCalls[0][1], 'view_item')
    assert.equal(gtagCalls[1][1], 'add_to_cart')
    assert.equal(gtagCalls[2][1], 'begin_checkout')

    // Reject unverified or incomplete purchase calls
    assert.equal(
      trackPurchase({
        verifiedPayment: false as any,
        transaction_id: 'MG-1001',
        value: 2450,
        items: [item],
      }),
      false
    )
    assert.equal(
      trackPurchase({
        verifiedPayment: true,
        transaction_id: '',
        value: 2450,
        items: [item],
      }),
      false
    )

    // Verified purchase fires ONCE and deduplicates on reload
    assert.equal(
      trackPurchase({
        verifiedPayment: true,
        transaction_id: 'MG-999999',
        value: 2450,
        tax: 196,
        shipping: 0,
        items: [item],
      }),
      true
    )
    assert.equal(
      trackPurchase({
        verifiedPayment: true,
        transaction_id: 'MG-999999',
        value: 2450,
        items: [item],
      }),
      false
    )
  } finally {
    cleanupMockBrowser()
  }
})

test('ensureGaConfiguredOnPublicEntry never double-configures GA4', () => {
  const { mockWindow, gtagCalls } = createMockBrowser('/')
  try {
    // Already configured by root <head> tag -> guaranteed no-op
    mockWindow.__mgGa4Configured = true
    assert.equal(ensureGaConfiguredOnPublicEntry('G-TXQ580DX7M'), false)
    assert.equal(gtagCalls.length, 0)

    // Entering public page after starting on /admin -> configures exactly once
    mockWindow.__mgGa4Configured = false
    assert.equal(ensureGaConfiguredOnPublicEntry('G-TXQ580DX7M'), true)
    assert.equal(ensureGaConfiguredOnPublicEntry('G-TXQ580DX7M'), false)
    assert.equal(gtagCalls.length, 2)
    assert.equal(gtagCalls[0][0], 'js')
    assert.deepEqual(gtagCalls[1], ['config', 'G-TXQ580DX7M'])
  } finally {
    cleanupMockBrowser()
  }
})
