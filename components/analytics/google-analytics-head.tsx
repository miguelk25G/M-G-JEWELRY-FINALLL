import {
  ANALYTICS_CONSENT_COOKIE_NAME,
  ANALYTICS_CONSENT_STORAGE_KEY,
  EEA_UK_CH_REGIONS,
  isGaEnabledForEnvironment,
  resolveGaMeasurementId,
} from '@/lib/analytics/config'

/**
 * Server component rendered inside `<head>` of `app/layout.tsx`.
 *
 * Implements the official Google Analytics 4 Google tag (`gtag.js`) with
 * Google Consent Mode v2 initialized atomically BEFORE `gtag('js')` and
 * `gtag('config')` inside a single inline script so browser caching of
 * `gtag/js` can never race ahead of consent defaults.
 *
 * SPA navigation support (Next.js App Router):
 * Verified directly on `G-TXQ580DX7M` (linked to Google tag `GTM-N4XKV74N`):
 * GA4 Enhanced Measurement has `vtp_historyEvents: true` enabled, so GA4
 * automatically tracks `history.pushState`, `replaceState`, and `popstate`
 * route transitions without a full page reload. We deliberately do NOT fire
 * an additional manual `usePathname()` `page_view` event so there are zero
 * duplicate `page_view` hits.
 */
export function GoogleAnalyticsHead() {
  if (!isGaEnabledForEnvironment()) {
    return null
  }

  const measurementId = resolveGaMeasurementId()
  const serializedMeasurementId = JSON.stringify(measurementId)
  const serializedStorageKey = JSON.stringify(ANALYTICS_CONSENT_STORAGE_KEY)
  const serializedCookieName = JSON.stringify(ANALYTICS_CONSENT_COOKIE_NAME)
  const serializedRegions = JSON.stringify(EEA_UK_CH_REGIONS)

  const gtagInitScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
(function(){
  var choice = null;
  try {
    choice = window.localStorage.getItem(${serializedStorageKey});
  } catch (e) {}
  if (choice !== 'granted' && choice !== 'denied') {
    var match = document.cookie.match(new RegExp('(?:^|;\\\\s*)' + ${serializedCookieName} + '=(granted|denied)(?:;|$)'));
    if (match) choice = match[1];
  }
  var gpc = typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
  if (choice === 'granted' || choice === 'denied') {
    gtag('consent', 'default', {
      analytics_storage: choice,
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    });
  } else {
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      region: ${serializedRegions},
      wait_for_update: 500
    });
    gtag('consent', 'default', {
      analytics_storage: gpc ? 'denied' : 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    });
  }
  var path = window.location && window.location.pathname ? window.location.pathname : '';
  if (path === '/admin' || path.indexOf('/admin/') === 0) return;
  if (window.__mgGa4Configured) return;
  window.__mgGa4Configured = true;
  gtag('js', new Date());
  gtag('config', ${serializedMeasurementId});
})();
`.trim()

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      />
      <script
        id="mg-ga4-init"
        dangerouslySetInnerHTML={{ __html: gtagInitScript }}
      />
    </>
  )
}
