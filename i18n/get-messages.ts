import type { Locale } from './config'

const dictionaries = {
  en: () => import('./messages/en.json').then((module) => module.default),
  es: () => import('./messages/es.json').then((module) => module.default),
}

export const getMessages = async (locale: Locale) => {
  return dictionaries[locale]()
}

export type Messages = Awaited<ReturnType<typeof getMessages>>
