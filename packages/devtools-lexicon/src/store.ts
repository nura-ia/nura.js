import type { NLexicon, NLocale } from '@nura-js/core'

export type LexRow = { term: string; canonical: string }

export function listTerms(lex: NLexicon & { entries?: any }, locale: NLocale): LexRow[] {
  const pack = lex.entries?.[locale] ?? {}
  return (Object.entries(pack) as Array<[string, any]>).map(([term, sense]) => ({
    term,
    canonical: typeof sense === 'string' ? sense : sense?.canonical ?? sense,
  }))
}

export function setTerm(lex: NLexicon & { register?: any }, locale: NLocale, row: LexRow) {
  if (lex.set) {
    lex.set(locale, row.term, row.canonical)
  } else if (lex.register) {
    lex.register(locale, row.term, { canonical: row.canonical })
  }
}

export function deleteTerm(lex: NLexicon & { entries?: any }, locale: NLocale, term: string) {
  const entries = lex.entries?.[locale]
  if (entries) {
    delete entries[term.toLowerCase()]
  }
}

export function importJson(lex: NLexicon, locale: NLocale, json: Record<string, string>) {
  if (lex.bulk) {
    lex.bulk(locale, json)
  }
}

export function exportJson(lex: NLexicon & { entries?: any }, locale: NLocale): Record<string, string> {
  const pack = lex.entries?.[locale] ?? {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(pack) as Array<[string, any]>) {
    out[key] = typeof value === 'string' ? value : value?.canonical ?? value
  }
  return out
}
