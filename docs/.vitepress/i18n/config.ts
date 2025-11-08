export const DEFAULT_LOCALE = 'en'
export const FALLBACK_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['en', 'es'] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]

const STORAGE_KEY = 'nura-docs-locale'

export function getStoredLocale(): LocaleCode | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const value = localStorage.getItem(STORAGE_KEY)
  if (!value) return null
  return SUPPORTED_LOCALES.includes(value as LocaleCode) ? (value as LocaleCode) : null
}

export function detectLocale(): LocaleCode {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE
  }

  const userLang = navigator.language?.toLowerCase()
  if (!userLang) return DEFAULT_LOCALE

  const directMatch = SUPPORTED_LOCALES.find((locale) => userLang.startsWith(locale))
  return directMatch ?? DEFAULT_LOCALE
}

export function persistLocale(locale: LocaleCode) {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, locale)
}
