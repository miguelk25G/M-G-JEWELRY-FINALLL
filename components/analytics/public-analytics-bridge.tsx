'use client'

import { useEffect } from 'react'
import { ensureGaConfiguredOnPublicEntry } from '@/lib/analytics/ga4'

/**
 * Mounted once in `app/(public)/layout.tsx`.
 *
 * On normal public visits, the `<head>` Google tag already configured GA4 and
 * set `window.__mgGa4Configured = true`, making this a guaranteed no-op
 * (preventing duplicate `page_view` events).
 *
 * If a user started on an excluded `/admin` route and client-side navigated
 * into the public storefront, this ensures GA4 initializes once on entry.
 */
export function PublicAnalyticsBridge({ measurementId }: { measurementId?: string }) {
  useEffect(() => {
    ensureGaConfiguredOnPublicEntry(measurementId)
  }, [measurementId])

  return null
}
