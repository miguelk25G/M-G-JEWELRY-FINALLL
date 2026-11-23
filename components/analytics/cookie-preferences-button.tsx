'use client'

import { useTranslation } from '@/i18n/locale-context'
import { openCookiePreferences } from '@/lib/analytics/consent'

export function CookiePreferencesButton() {
  const { locale } = useTranslation()

  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {locale === 'es' ? 'Preferencias de Cookies' : 'Cookie Preferences'}
    </button>
  )
}
