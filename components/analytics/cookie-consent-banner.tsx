'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/locale-context'
import {
  CONSENT_OPEN_EVENT,
  getStoredAnalyticsConsent,
  isGlobalPrivacyControlEnabled,
  saveAnalyticsConsent,
  type AnalyticsConsentChoice,
} from '@/lib/analytics/consent'

export function CookieConsentBanner() {
  const { locale } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [currentChoice, setCurrentChoice] = useState<AnalyticsConsentChoice | null>(null)
  const [gpcActive, setGpcActive] = useState(false)

  useEffect(() => {
    const stored = getStoredAnalyticsConsent()
    setCurrentChoice(stored)
    setGpcActive(isGlobalPrivacyControlEnabled())

    if (!stored) {
      setIsVisible(true)
    }

    const handleReopen = () => {
      setCurrentChoice(getStoredAnalyticsConsent())
      setGpcActive(isGlobalPrivacyControlEnabled())
      setIsVisible(true)
    }

    window.addEventListener(CONSENT_OPEN_EVENT, handleReopen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, handleReopen)
  }, [])

  const handleChoice = (choice: AnalyticsConsentChoice) => {
    saveAnalyticsConsent(choice)
    setCurrentChoice(choice)
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  const isEs = locale === 'es'

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={isEs ? 'Preferencias de cookies y privacidad' : 'Cookie and privacy preferences'}
      className="fixed bottom-24 left-4 right-4 z-40 rounded-xl border border-border bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur-md md:bottom-6 md:left-6 md:right-auto md:max-w-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          <h2 className="font-serif text-sm font-semibold text-foreground">
            {isEs ? 'Privacidad y Cookies' : 'Privacy & Cookies'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          aria-label={isEs ? 'Cerrar aviso de cookies' : 'Dismiss cookie notice'}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {isEs
          ? 'Utilizamos cookies esenciales para el funcionamiento del sitio y Google Analytics 4 para comprender cómo navegan nuestros clientes y mejorar su experiencia. Puedes aceptar o rechazar las cookies de análisis en cualquier momento.'
          : 'We use essential cookies to keep the site running and Google Analytics 4 to understand how visitors explore our collections and improve your experience. You can accept or decline analytics cookies at any time.'}
      </p>

      {gpcActive && currentChoice === null && (
        <p className="mt-1.5 text-[11px] text-primary">
          {isEs
            ? 'Señal Global Privacy Control (GPC) detectada: las cookies de análisis están desactivadas por defecto.'
            : 'Global Privacy Control (GPC) detected: analytics cookies are turned off by default.'}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => handleChoice('denied')}
        >
          {isEs ? 'Solo esenciales' : 'Essential Only'}
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          onClick={() => handleChoice('granted')}
        >
          {isEs ? 'Aceptar análisis' : 'Accept Analytics'}
        </Button>
      </div>
    </div>
  )
}
