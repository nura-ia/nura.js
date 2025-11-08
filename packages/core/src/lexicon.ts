import type { NLocale } from './types'
import type { NTelemetry } from './telemetry'

export type NCanonical = string

export interface NSense {
  canonical: NCanonical
  weight?: number
}

export interface NLexicon {
  entries: Record<NLocale, Record<string, NSense>>
  register(locale: NLocale, term: string, sense: NSense): void
  normalize(locale: NLocale, term: string): NCanonical | undefined
  bulk(locale: NLocale, batch: Record<string, NCanonical>): void
  registerPhonetic(locale: 'es' | 'en', term: string, canonical: string): void
  lookupPhonetic(locale: 'es' | 'en', term: string): string | null
}

export function createLexicon(telemetry?: Pick<NTelemetry, 'emit'>): NLexicon {
  const entries: Record<NLocale, Record<string, NSense>> = {}
  const phonetics: Record<'es' | 'en', Record<string, string>> = {
    es: {},
    en: {},
  }
  return {
    entries,
    register(locale, term, sense) {
      const lower = term.toLowerCase()
      const l = (entries[locale] ??= {})
      l[lower] = { canonical: sense.canonical, weight: sense.weight ?? 1 }
      telemetry?.emit?.('lexicon.register', {
        locale,
        term: lower,
        canonical: sense.canonical,
      })
    },
    bulk(locale, batch) {
      const l = (entries[locale] ??= {})
      for (const [k, v] of Object.entries(batch)) {
        const lower = k.toLowerCase()
        l[lower] = { canonical: v, weight: 1 }
        telemetry?.emit?.('lexicon.bulk', {
          locale,
          term: lower,
          canonical: v,
        })
      }
    },
    registerPhonetic(locale, term, canonical) {
      const lower = term.toLowerCase().trim()
      if (!lower) return
      phonetics[locale][lower] = canonical
      telemetry?.emit?.('lexicon.phonetic.register', {
        locale,
        term: lower,
        canonical,
      })
    },
    lookupPhonetic(locale, term) {
      const lower = term.toLowerCase().trim()
      if (!lower) return null
      const searchLocales: ('es' | 'en')[] = []
      if (locale === 'es' || locale === 'en') {
        searchLocales.push(locale)
      }
      const base = locale.split('-')[0]
      if (base === 'es' || base === 'en') {
        if (!searchLocales.includes(base)) searchLocales.push(base)
      }
      let best: { canonical: string; score: number } | null = null
      for (const loc of searchLocales) {
        const bank = phonetics[loc]
        for (const [alias, canonical] of Object.entries(bank)) {
          if (alias === lower) {
            return canonical
          }
          const score = phoneticSimilarity(lower, alias)
          if (!best || score > best.score) {
            best = { canonical, score }
          }
        }
      }
      if (best && best.score >= 0.8) return best.canonical
      return null
    },
    normalize(locale, term) {
      const lower = term.toLowerCase().trim()
      const pack = entries[locale] ?? {}
      if (pack[lower]) {
        const result = pack[lower].canonical
        telemetry?.emit?.('lexicon.normalize', {
          locale,
          term: lower,
          result,
        })
        return result
      }
      const short = locale.split('-')[0]
      const base = entries[short] ?? {}
      let result: string | undefined = base[lower]?.canonical
      if (!result) {
        const phonetic = this.lookupPhonetic(short as 'es' | 'en', lower)
        if (phonetic) {
          telemetry?.emit?.('lexicon.normalize.phonetic', {
            locale,
            term: lower,
            result: phonetic,
          })
          return phonetic
        }
        result = this.lookupPhonetic(locale.startsWith('es') ? 'es' : 'en', lower) ?? undefined
      }
      telemetry?.emit?.('lexicon.normalize', {
        locale,
        term: lower,
        result: result ?? null,
      })
      return result
    },
  }
}

function phoneticSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const distance = damerauLevenshtein(a, b)
  return 1 - distance / maxLen
}

function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length
  const lenB = b.length
  const dist: number[][] = Array.from({ length: lenA + 2 }, () => new Array(lenB + 2).fill(0))
  const maxDist = lenA + lenB
  dist[0][0] = maxDist
  for (let i = 0; i <= lenA; i++) {
    dist[i + 1][0] = maxDist
    dist[i + 1][1] = i
  }
  for (let j = 0; j <= lenB; j++) {
    dist[0][j + 1] = maxDist
    dist[1][j + 1] = j
  }
  const da: Record<string, number> = {}
  for (let i = 1; i <= lenA; i++) {
    let db = 0
    for (let j = 1; j <= lenB; j++) {
      const i1 = da[b[j - 1]] ?? 0
      const j1 = db
      let cost = 1
      if (a[i - 1] === b[j - 1]) {
        cost = 0
        db = j
      }
      dist[i + 1][j + 1] = Math.min(
        dist[i][j] + cost,
        dist[i + 1][j] + 1,
        dist[i][j + 1] + 1,
        dist[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1),
      )
    }
    da[a[i - 1]] = i
  }
  return dist[lenA + 1][lenB + 1]
}
