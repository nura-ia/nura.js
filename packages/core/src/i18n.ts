import type { NLocale as CoreLocale } from './types'
import type { NTelemetry } from './telemetry'
export type NLocale = CoreLocale
export type NNamespaces = 'common' | 'actions' | 'ui' | string
export type NMessages = Record<string, string>
export type NBundle = Record<NNamespaces, NMessages>
export interface NI18nConfig {
  defaultLocale: NLocale
  fallbackLocales?: NLocale[]
  bundles?: Record<NLocale, NBundle>
  detect?: () => NLocale | undefined
}
export interface NI18n {
  getLocale(): NLocale
  setLocale(locale: NLocale): void
  t(ns: NNamespaces, key: string, vars?: Record<string, unknown>): string
  has(ns: NNamespaces, key: string, locale?: NLocale): boolean
  register(locale: NLocale, ns: NNamespaces, entries: NMessages): void
  resolveKey(locale: NLocale, ns: NNamespaces, key: string): string | undefined
}
export function createI18n(cfg: NI18nConfig & { telemetry?: Pick<NTelemetry, 'emit'> }): NI18n {
  const bundles: Record<NLocale, NBundle> = Object.assign(Object.create(null), structuredClone(cfg.bundles ?? {}))
  let locale = cfg.detect?.() ?? cfg.defaultLocale
  const locales = (primary: string) => Array.from(new Set([primary, primary.split('-')[0], ...(cfg.fallbackLocales ?? [])].filter(Boolean)))
  return {
    getLocale: () => locale,
    setLocale(value) { locale = value },
    register(value, ns, entries) { const bundle = (bundles[value] ??= Object.create(null) as NBundle); bundle[ns] = Object.assign(Object.create(null), bundle[ns] ?? {}, entries) },
    has(ns, key, value) { return locales(value ?? locale).some((item) => typeof bundles[item]?.[ns]?.[key] === 'string') },
    resolveKey(value, ns, key) { for (const item of locales(value)) { const found = bundles[item]?.[ns]?.[key]; if (typeof found === 'string') return found } return undefined },
    t(ns, key, vars) {
      const raw = this.resolveKey(locale, ns, key) ?? this.resolveKey(cfg.defaultLocale, ns, key)
      if (raw == null) { cfg.telemetry?.emit('i18n.miss', { ns, key, locale }); return key }
      return vars ? raw.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? '')) : raw
    },
  }
}
