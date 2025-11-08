import { matchFuzzy } from '@nura/plugin-fuzzy'

import type { NLocale } from '../types'
import { toNumberLoose } from '../nlp/numerals'

type ParseEnumOpts = { locale: NLocale }

type RangeResult =
  | { min: number; max: number }
  | { min: number; max?: number }
  | { min?: number; max: number }
  | undefined

function baseLocale(locale: NLocale): 'es' | 'en' {
  const short = locale.split('-')[0]
  return short === 'en' ? 'en' : 'es'
}

export const parseBoolean = (raw: string, opts: { locale: NLocale }): boolean | undefined => {
  const t = raw.trim().toLowerCase()
  if (!t) return undefined
  const locale = baseLocale(opts.locale)
  const truthy = locale === 'es'
    ? ['sí', 'si', 'verdadero', 'cierto', 'on', 'encendido', 'activo', 'habilitar', 'habilitado', 'true', '1']
    : ['yes', 'true', 'on', 'enable', 'enabled', 'sure', 'affirmative', '1']
  const falsy = locale === 'es'
    ? ['no', 'falso', 'false', 'off', 'apagado', 'deshabilitar', 'deshabilitado', '0']
    : ['no', 'false', 'off', 'disable', 'disabled', '0']
  if (truthy.includes(t)) return true
  if (falsy.includes(t)) return false
  return undefined
}

export const parseEnum = (
  raw: string,
  allowed: string[],
  { locale }: ParseEnumOpts,
): string | undefined => {
  if (!allowed || allowed.length === 0) return undefined
  const normalized = raw.trim().toLowerCase()
  if (!normalized) return undefined
  const direct = allowed.find((candidate) => candidate.toLowerCase() === normalized)
  if (direct) return direct
  if (allowed.length <= 12) {
    const fuzzy = matchFuzzy(normalized, allowed, {
      locale: baseLocale(locale),
      minConfidence: 0.7,
    })
    if (fuzzy) return fuzzy.value
  }
  return undefined
}

export const parseDate = (raw: string, { locale }: { locale: NLocale }): Date | undefined => {
  const t = raw.trim().toLowerCase()
  if (!t) return undefined
  const now = new Date()
  const short = baseLocale(locale)

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const parsed = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  const dayFirst = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (dayFirst) {
    const [_, a, b, c] = dayFirst
    const day = Number(short === 'es' ? a : b)
    const month = Number(short === 'es' ? b : a)
    const year = Number(c.length === 2 ? `20${c}` : c)
    const parsed = new Date(year, month - 1, day)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  if (short === 'es') {
    if (t === 'hoy') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (t === 'mañana' || t === 'manana') {
      const d = new Date(now)
      d.setDate(d.getDate() + 1)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
    if (t === 'ayer') {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
  } else {
    if (t === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (t === 'tomorrow') {
      const d = new Date(now)
      d.setDate(d.getDate() + 1)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
    if (t === 'yesterday') {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
  }
  return undefined
}

export const parseRangeNumber = (
  raw: string,
  { locale }: { locale: NLocale },
): RangeResult => {
  const text = raw.trim().toLowerCase()
  if (!text) return undefined
  const short = baseLocale(locale)

  const between = text.match(/(\d+(?:[.,]\d+)?)\s*(?:a|hasta|to|until)\s*(\d+(?:[.,]\d+)?)/)
  if (between) {
    const min = Number(between[1].replace(',', '.'))
    const max = Number(between[2].replace(',', '.'))
    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max }
  }

  const compare = text.match(/^(>=|<=|>|<)\s*(\d+(?:[.,]\d+)?)/)
  if (compare) {
    const op = compare[1]
    const val = Number(compare[2].replace(',', '.'))
    if (!Number.isFinite(val)) return undefined
    if (op === '>=' || op === '>') return { min: val }
    if (op === '<=' || op === '<') return { max: val }
  }

  const less = short === 'es'
    ? text.match(/menos de\s+(.*)$/)
    : text.match(/less than\s+(.*)$/)
  if (less) {
    const num = toNumberLoose(less[1]!, short)
    if (num != null) return { max: num }
  }

  const more = short === 'es'
    ? text.match(/(mas|más) de\s+(.*)$/)
    : text.match(/more than\s+(.*)$/)
  if (more) {
    const num = toNumberLoose(more[2] ?? more[1] ?? '', short)
    if (num != null) return { min: num }
  }

  const single = toNumberLoose(text, short)
  if (single != null) return { min: single, max: single }
  return undefined
}
