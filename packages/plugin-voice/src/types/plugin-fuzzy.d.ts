declare module '@nura/plugin-fuzzy' {
  export type FuzzyStrategy = 'damerau' | 'soundex' | 'double-metaphone' | 'hybrid'

  export interface FuzzyMatchOpts {
    strategy?: FuzzyStrategy
    minConfidence?: number
    locale?: 'es' | 'en'
    maxCandidates?: number
  }

  export interface TokenScore {
    token: string
    candidate: string
    score: number
    via: 'exact' | 'phonetic' | 'edit'
    index?: number
  }

  export interface MatchResult {
    value: string
    score: number
    strategy: FuzzyStrategy
    matchedTokens?: TokenScore[]
  }

  export function damerauLevenshteinSimilarity(a: string, b: string): number
  export function matchFuzzy(
    input: string,
    candidates: string[],
    opts?: FuzzyMatchOpts,
  ): MatchResult | null
  export function tokenizeAndScore(
    input: string,
    candidates: string[],
    opts?: FuzzyMatchOpts,
  ): TokenScore[]
  export function compareWakeWord(
    input: string,
    wake: { canonical: string; aliases?: string[] },
    opts?: FuzzyMatchOpts,
  ): MatchResult | null
}
