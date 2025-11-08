import {
  compareWakeWord as fuzzyCompareWakeWord,
  damerauLevenshteinSimilarity,
  type FuzzyMatchOpts,
} from '@nura/plugin-fuzzy'

const CANONICAL_WAKE = 'nura'
const DEFAULT_MIN_CONFIDENCE = 0.7
const WAKE_PREFIXES = new Set(['ok', 'okay', 'okey'])
const TRAILING_CLEANUP = /[\s,.;:!?¡¿-]/

export type CompareWakeWord = (
  input: string,
  wake: { canonical: string; aliases?: string[] },
  opts?: FuzzyMatchOpts,
) => { score: number; value?: string; strategy?: string } | null

export type StripWakeOptions = {
  aliases?: string[]
  minConfidence?: number
  compare?: (a: string, b: string) => number
  compareWakeWord?: CompareWakeWord | null
}

const defaultCompareWakeWord: CompareWakeWord = (
  input,
  wake,
  opts,
) => fuzzyCompareWakeWord(input, wake, opts) as ReturnType<CompareWakeWord>

export const compareWakeWord = defaultCompareWakeWord

export function stripWake(raw: string, opts: StripWakeOptions = {}): string {
  if (!raw) return raw

  const aliases = normalizeAliasList(opts.aliases)
  if (aliases.length === 0) return raw

  const tokens = tokenize(raw)
  if (tokens.length === 0) return raw.trim()

  const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE
  const compareWake =
    opts.compareWakeWord === undefined ? defaultCompareWakeWord : opts.compareWakeWord
  const comparator = opts.compare ?? defaultCompare
  const normalizedAliases = aliases.map(normalizeForComparison).filter(Boolean)

  let bestMatch: { start: number; end: number; score: number } | null = null

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    if (!WAKE_PREFIXES.has(stripPunctuation(token.value))) continue

    for (let length = 1; length <= 2; length += 1) {
      const aliasEndIndex = index + length
      const aliasTokens = tokens.slice(index + 1, aliasEndIndex + 1)
      if (aliasTokens.length !== length) continue

      const candidateValue = aliasTokens.map((t) => t.value).join(' ')
      const normalizedCandidate = normalizeForComparison(candidateValue)
      if (!normalizedCandidate) continue

      let score = 0
      let evaluatedWithWake = false

      if (compareWake) {
        const result = compareWake(
          candidateValue,
          { canonical: CANONICAL_WAKE, aliases: aliases.filter((item) => item !== CANONICAL_WAKE) },
          { minConfidence },
        )
        if (result && typeof result.score === 'number') {
          score = result.score
          evaluatedWithWake = true
        }
      }

      if (!evaluatedWithWake || score < minConfidence) {
        score = evaluateWithComparator(normalizedCandidate, normalizedAliases, comparator)
      }

      if (score < minConfidence) continue

      const removalStart = adjustRemovalStart(raw, token.start)
      const removalEnd = adjustRemovalEnd(raw, tokens[aliasEndIndex]!.end)

      if (
        !bestMatch ||
        score > bestMatch.score ||
        (score === bestMatch.score && removalStart < bestMatch.start)
      ) {
        bestMatch = { start: removalStart, end: removalEnd, score }
      }
    }
  }

  if (!bestMatch) return raw

  const before = raw.slice(0, bestMatch.start).trim()
  const after = raw.slice(bestMatch.end).trim()

  if (before && after) return `${before} ${after}`.replace(/\s+/g, ' ')
  if (before) return before
  if (after) return after
  return ''
}

function tokenize(text: string): Array<{ value: string; start: number; end: number }> {
  const result: Array<{ value: string; start: number; end: number }> = []
  const regex = /[^\s]+/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    result.push({ value: match[0]!, start: match.index, end: match.index + match[0]!.length })
  }
  return result
}

function stripPunctuation(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}]+$/u, '')
}

function normalizeAliasList(aliases: string[] | undefined): string[] {
  const set = new Set<string>()
  set.add(CANONICAL_WAKE)
  if (aliases) {
    for (const alias of aliases) {
      const value = alias?.trim()
      if (value) set.add(value)
    }
  }
  return Array.from(set)
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function evaluateWithComparator(
  candidate: string,
  aliases: string[],
  comparator: (a: string, b: string) => number,
): number {
  if (!candidate) return 0
  let best = 0
  for (const alias of aliases) {
    if (!alias) continue
    const score = comparator(candidate, alias)
    if (score > best) {
      best = score
    }
  }
  return best
}

function adjustRemovalStart(text: string, start: number): number {
  let index = start
  while (index > 0 && /\s/.test(text.charAt(index - 1))) {
    index -= 1
  }
  return index
}

function adjustRemovalEnd(text: string, end: number): number {
  let index = end
  while (index < text.length && TRAILING_CLEANUP.test(text.charAt(index))) {
    index += 1
  }
  return index
}

function defaultCompare(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const distance = damerauLevenshteinSimilarity(a, b)
  let best = distance
  if (best < 1) {
    const soundexA = soundex(a)
    const soundexB = soundex(b)
    if (soundexA && soundexA === soundexB) {
      best = Math.max(best, 0.8)
    }
  }
  return best
}

function soundex(value: string): string {
  const input = value.replace(/[^a-z]/g, '')
  if (!input) return ''
  const first = input[0]!
  let result = first
  let previousCode = mapSoundexCode(first)
  for (let index = 1; index < input.length && result.length < 4; index += 1) {
    const char = input[index]!
    const code = mapSoundexCode(char)
    if (code === '0' || code === previousCode) {
      previousCode = code
      continue
    }
    result += code
    previousCode = code
  }
  return (result + '000').slice(0, 4)
}

function mapSoundexCode(char: string): string {
  switch (char) {
    case 'b':
    case 'f':
    case 'p':
    case 'v':
      return '1'
    case 'c':
    case 'g':
    case 'j':
    case 'k':
    case 'q':
    case 's':
    case 'x':
    case 'z':
      return '2'
    case 'd':
    case 't':
      return '3'
    case 'l':
      return '4'
    case 'm':
    case 'n':
      return '5'
    case 'r':
      return '6'
    case 'h':
    case 'w':
    case 'y':
      return '0'
    default:
      return '0'
  }
}
