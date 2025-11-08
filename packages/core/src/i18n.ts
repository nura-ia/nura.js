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

export function createI18n(
  cfg: NI18nConfig & { telemetry?: Pick<NTelemetry, 'emit'> },
): NI18n {
  const bundles: Record<NLocale, NBundle> = structuredClone(cfg.bundles ?? {})
  let _locale: NLocale = cfg.detect?.() ?? cfg.defaultLocale

  function pickLocales(primary: NLocale): NLocale[] {
    const short = primary.split('-')[0]
    const uniq: string[] = []
    for (const l of [primary, short, ...(cfg.fallbackLocales ?? [])]) {
      if (l && !uniq.includes(l)) uniq.push(l)
    }
    return uniq
  }

  function interpolate(s: string, vars?: Record<string, unknown>) {
    if (!vars) return s
    return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''))
  }

  return {
    getLocale: () => _locale,
    setLocale(l) {
      _locale = l
    },
    register(locale, ns, entries) {
      const b = (bundles[locale] ??= {} as NBundle)
      b[ns] = { ...(b[ns] ?? {}), ...entries }
    },
    has(ns, key, locale) {
      const locs = pickLocales(locale ?? _locale)
      for (const l of locs) {
        const entry = bundles[l]?.[ns]?.[key]
        if (typeof entry === 'string') return true
      }
      return false
    },
    resolveKey(locale, ns, key) {
      const locs = pickLocales(locale)
      for (const l of locs) {
        const entry = bundles[l]?.[ns]?.[key]
        if (typeof entry === 'string') return entry
      }
      return undefined
    },
    t(ns, key, vars) {
      const raw =
        this.resolveKey(_locale, ns, key) ??
        this.resolveKey(cfg.defaultLocale, ns, key)
      if (raw == null) {
        cfg.telemetry?.emit?.('i18n.miss', {
          ns,
          key,
          locale: _locale,
          fallbacksTried: [
            _locale,
            _locale.split('-')[0],
            ...(cfg.fallbackLocales ?? []),
          ],
        })
        return key
      }
      return interpolate(raw, vars)
    },
  }
}
