'use client'

import React from "react"

import { createContext, useContext, useCallback, useTransition } from 'react'
import type { Locale } from './config'
import type { Messages } from './get-messages'

interface LocaleContextValue {
  locale: Locale
  messages: Messages
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode
  locale: Locale
  messages: Messages
}) {
  const [, startTransition] = useTransition()

  const setLocale = useCallback((newLocale: Locale) => {
    startTransition(() => {
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`
      window.location.reload()
    })
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const keys = key.split('.')
      let value: unknown = messages

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k]
        } else {
          return key
        }
      }

      if (typeof value !== 'string') return key

      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
          return String(params[paramKey] ?? `{${paramKey}}`)
        })
      }

      return value
    },
    [messages]
  )

  return (
    <LocaleContext.Provider value={{ locale, messages, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

export function useTranslation() {
  const { t, locale } = useLocale()
  return { t, locale }
}
