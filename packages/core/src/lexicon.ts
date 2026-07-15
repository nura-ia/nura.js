import type { NTelemetry } from './telemetry'
export type NCanonical = string
export type NSense = string
export interface NLexicon {
  bulk(locale: string, terms: Record<string, string>): void
  set(locale: string, term: string, canonical: string): void
  get(locale: string, term: string): string | undefined
}
export function createLexicon(_telemetry?: NTelemetry): NLexicon {
  const values = new Map<string, string>()
  return {
    bulk(locale, terms) { for (const [term, canonical] of Object.entries(terms)) values.set(`${locale}:${term}`, canonical) },
    set(locale, term, canonical) { values.set(`${locale}:${term}`, canonical) },
    get(locale, term) { return values.get(`${locale}:${term}`) },
  }
}
