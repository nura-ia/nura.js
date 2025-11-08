import type { NLexicon, NSense, NLocale } from '@nura/core'

export type LexRow = { term: string; canonical: string }

export function listTerms(lex: NLexicon, locale: NLocale): LexRow[] {
  const pack = lex.entries[locale] ?? {}
  return (Object.entries(pack) as Array<[string, NSense]>).map(([term, sense]) => ({
    term,
    canonical: sense.canonical,
  }))
}

export function setTerm(lex: NLexicon, locale: NLocale, row: LexRow) {
  lex.register(locale, row.term, { canonical: row.canonical })
}

export function deleteTerm(lex: NLexicon, locale: NLocale, term: string) {
  const entries = lex.entries[locale] ?? {}
  delete entries[term.toLowerCase()]
}

export function importJson(lex: NLexicon, locale: NLocale, json: Record<string, string>) {
  lex.bulk(locale, json)
}

export function exportJson(lex: NLexicon, locale: NLocale): Record<string, string> {
  const pack = lex.entries[locale] ?? {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(pack) as Array<[string, NSense]>) {
    out[key] = value.canonical
  }
  return out
}
