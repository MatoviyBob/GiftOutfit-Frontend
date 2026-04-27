import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react'
import { en } from './translations/en'
import { ru } from './translations/ru'
import { zh } from './translations/zh'

export type Locale = 'en' | 'ru' | 'zh'

export type Translations = typeof en

const translations: Record<Locale, Translations> = { en, ru, zh: zh as unknown as Translations }

const STORAGE_KEY = 'app-locale'

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored === 'en' || stored === 'ru' || stored === 'zh') return stored
  return 'en'
}

function setStoredLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale)
}

type GetByPath<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? GetByPath<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = obj
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[p]
  }
  return typeof current === 'string' ? current : undefined
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)

  useEffect(() => {
    setStoredLocale(locale)
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
  }, [])

  const t = useCallback(
    (key: string): string => {
      const dict = translations[locale] as Record<string, unknown>
      const value = getNested(dict, key)
      return value ?? key
    },
    [locale]
  )

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  )

  return React.createElement(I18nContext.Provider, { value }, children)
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider')
  return ctx
}

export function getGiftFieldLabelKey(fieldKey: string): string {
  const map: Record<string, string> = {
    gifts: 'giftDrawer.fieldGifts',
    model: 'giftDrawer.fieldModel',
    background: 'giftDrawer.fieldBackground',
    pattern: 'giftDrawer.fieldPattern',
  }
  return map[fieldKey] ?? 'common.all'
}
