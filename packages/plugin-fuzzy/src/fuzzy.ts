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

const DEFAULT_MIN_CONFIDENCE = 0.7
const DEFAULT_MAX_CANDIDATES = 5

const phoneticCache = new Map<string, { soundex: string; metaphone: [string, string] }>()

function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
}

function normalize(input: string): string {
  return stripDiacritics(input).toLowerCase().trim()
}

export function damerauLevenshteinSimilarity(a: string, b: string): number {
  const source = normalize(a)
  const target = normalize(b)
  if (!source && !target) return 1
  if (!source || !target) return 0
  const lenA = source.length
  const lenB = target.length
  const da: Record<string, number> = {}
  const maxDistance = lenA + lenB
  const dist: number[][] = Array.from({ length: lenA + 2 }, () => new Array<number>(lenB + 2).fill(0))

  dist[0][0] = maxDistance
  for (let i = 0; i <= lenA; i++) {
    dist[i + 1][0] = maxDistance
    dist[i + 1][1] = i
  }
  for (let j = 0; j <= lenB; j++) {
    dist[0][j + 1] = maxDistance
    dist[1][j + 1] = j
  }

  for (let i = 1; i <= lenA; i++) {
    let db = 0
    for (let j = 1; j <= lenB; j++) {
      const i1 = da[target[j - 1]] ?? 0
      const j1 = db
      let cost = 1
      if (source[i - 1] === target[j - 1]) {
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
    da[source[i - 1]] = i
  }

  const distance = dist[lenA + 1][lenB + 1]
  const maxLen = Math.max(lenA, lenB)
  return maxLen === 0 ? 1 : 1 - distance / maxLen
}

function cacheKey(locale: 'es' | 'en', value: string): string {
  return `${locale}:${value}`
}

function getPhoneticHashes(locale: 'es' | 'en', value: string): {
  soundex: string
  metaphone: [string, string]
} {
  const norm = normalize(value)
  const key = cacheKey(locale, norm)
  const cached = phoneticCache.get(key)
  if (cached) return cached
  const result = {
    soundex: soundexLikeEsEn(norm, locale),
    metaphone: doubleMetaphoneLite(norm, locale),
  }
  phoneticCache.set(key, result)
  return result
}

function isVowel(ch: string): boolean {
  return ['a', 'e', 'i', 'o', 'u', 'y'].includes(ch)
}

function soundexLikeEsEn(str: string, locale: 'es' | 'en'): string {
  const value = normalize(str)
  if (!value) return ''
    const upper = value.toUpperCase()
    let result = upper.charAt(0)
  let previousCode = letterCode(result, locale)
  for (let i = 1; i < upper.length; i++) {
    const code = letterCode(upper[i], locale)
    if (code === '0') {
      previousCode = code
      continue
    }
    if (code !== previousCode) {
      result += code
    }
    previousCode = code
  }
  result = result.padEnd(4, '0').slice(0, 4)
  return result
}

function letterCode(char: string, locale: 'es' | 'en'): string {
  switch (char) {
    case 'B':
    case 'F':
    case 'P':
    case 'V':
    case 'W':
      return '1'
    case 'C':
    case 'G':
    case 'J':
    case 'K':
    case 'Q':
    case 'S':
    case 'X':
    case 'Z':
      if (locale === 'es' && (char === 'C' || char === 'Z' || char === 'S')) return '2'
      return '2'
    case 'D':
    case 'T':
      return '3'
    case 'L':
      return '4'
    case 'M':
    case 'N':
      return '5'
    case 'R':
      return '6'
    default:
      return '0'
  }
}

function doubleMetaphoneLite(value: string, locale: 'es' | 'en'): [string, string] {
  const input = normalize(value)
  if (!input) return ['', '']
  const primary: string[] = []
  const secondary: string[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    const next = input[i + 1] ?? ''
    const prev = input[i - 1] ?? ''

    if (ch === next && ch !== 'c') {
      i++
      continue
    }

    switch (ch) {
      case 'p':
        if (next === 'h') {
          primary.push('f')
          secondary.push('f')
          i += 2
          continue
        }
        primary.push('p')
        secondary.push('p')
        break
      case 'b':
      case 'v':
      case 'w':
        primary.push('b')
        secondary.push('b')
        break
      case 'c':
        if (next === 'h') {
          primary.push('x')
          secondary.push('x')
          i += 2
          continue
        }
        if (next === 'e' || next === 'i' || next === 'y') {
          primary.push('s')
          secondary.push('s')
        } else {
          primary.push('k')
          secondary.push('k')
        }
        break
      case 'q':
      case 'k':
      case 'g': {
        if (ch === 'g' && (next === 'e' || next === 'i' || next === 'y')) {
          primary.push(locale === 'en' ? 'j' : 'h')
          secondary.push(locale === 'en' ? 'j' : 'h')
        } else {
          primary.push('k')
          secondary.push('k')
        }
        break
      }
      case 'x':
        primary.push('ks')
        secondary.push('ks')
        break
      case 'z':
        primary.push(locale === 'en' ? 'z' : 's')
        secondary.push(locale === 'en' ? 'z' : 's')
        break
      case 'd':
      case 't':
        if (next === 'i' && input[i + 2] === 'o') {
          primary.push('j')
          secondary.push('j')
        } else {
          primary.push('t')
          secondary.push('t')
        }
        break
      case 'l':
        primary.push('l')
        secondary.push('l')
        break
      case 'r':
        primary.push('r')
        secondary.push('r')
        break
      case 'y':
        primary.push('y')
        secondary.push('y')
        break
      case 'j':
        primary.push('j')
        secondary.push('j')
        break
      case 's':
        if (next === 'h') {
          primary.push('x')
          secondary.push('x')
          i += 2
          continue
        }
        primary.push('s')
        secondary.push('s')
        break
      case 'h':
        if (!isVowel(prev) || !isVowel(next)) {
          primary.push('h')
          secondary.push('h')
        }
        break
      case 'f':
      case 'm':
      case 'n':
        primary.push(ch)
        secondary.push(ch)
        break
      default:
        if (primary.length === 0) {
          primary.push(ch)
          secondary.push(ch)
        }
        break
    }
    i++
  }

  const primaryKey = primary.join('').replace(/([^a-z])/g, '')
  const secondaryKey = secondary.join('').replace(/([^a-z])/g, '')
  if (!secondaryKey || secondaryKey === primaryKey) return [primaryKey, primaryKey]
  return [primaryKey, secondaryKey]
}

function scoreByStrategy(
  input: string,
  candidate: string,
  strategy: FuzzyStrategy,
  locale: 'es' | 'en',
): { score: number; via: 'exact' | 'phonetic' | 'edit'; details: TokenScore } {
  const normalizedInput = normalize(input)
  const normalizedCandidate = normalize(candidate)
  if (normalizedInput === normalizedCandidate) {
    return {
      score: 1,
      via: 'exact',
      details: { token: normalizedInput, candidate: candidate, score: 1, via: 'exact' },
    }
  }

  const editScore = damerauLevenshteinSimilarity(normalizedInput, normalizedCandidate)
  const { soundex, metaphone } = getPhoneticHashes(locale, normalizedCandidate)
  const { soundex: inputSoundex, metaphone: inputMetaphone } = getPhoneticHashes(locale, normalizedInput)

  let phoneticScore = 0
  if (soundex && inputSoundex && soundex === inputSoundex) {
    phoneticScore = 0.88
  }
  if (
    metaphone[0] &&
    (metaphone[0] === inputMetaphone[0] || metaphone[0] === inputMetaphone[1])
  ) {
    phoneticScore = Math.max(phoneticScore, 0.9)
  }
  if (
    metaphone[1] &&
    (metaphone[1] === inputMetaphone[0] || metaphone[1] === inputMetaphone[1])
  ) {
    phoneticScore = Math.max(phoneticScore, 0.86)
  }

    const prefixBonus = normalizedCandidate.startsWith(normalizedInput.charAt(0)) ? 0.03 : 0

  if (strategy === 'damerau') {
    return {
      score: editScore,
      via: 'edit',
      details: { token: normalizedInput, candidate, score: editScore, via: 'edit' },
    }
  }
  if (strategy === 'soundex') {
    return {
      score: Math.max(phoneticScore, editScore * 0.8),
      via: phoneticScore > editScore ? 'phonetic' : 'edit',
      details: {
        token: normalizedInput,
        candidate,
        score: Math.max(phoneticScore, editScore * 0.8),
        via: phoneticScore > editScore ? 'phonetic' : 'edit',
      },
    }
  }
  if (strategy === 'double-metaphone') {
    return {
      score: Math.max(phoneticScore, editScore * 0.7),
      via: phoneticScore >= editScore ? 'phonetic' : 'edit',
      details: {
        token: normalizedInput,
        candidate,
        score: Math.max(phoneticScore, editScore * 0.7),
        via: phoneticScore >= editScore ? 'phonetic' : 'edit',
      },
    }
  }

  const base = Math.max(editScore, phoneticScore)
  const hybridScore = Math.min(1, base + prefixBonus)
  const via: 'phonetic' | 'edit' = phoneticScore >= editScore ? 'phonetic' : 'edit'
  return {
    score: hybridScore,
    via,
    details: { token: normalizedInput, candidate, score: hybridScore, via },
  }
}

export function matchFuzzy(
  input: string,
  candidates: string[],
  opts: FuzzyMatchOpts = {},
): MatchResult | null {
    const { strategy = 'hybrid', minConfidence = DEFAULT_MIN_CONFIDENCE, locale = 'es' } = opts
    if (!input || candidates.length === 0) return null
    const localeSafe = locale
  let best: MatchResult | null = null
  for (const candidate of candidates) {
    const scored = scoreByStrategy(input, candidate, strategy, localeSafe)
    if (!best || scored.score > best.score) {
      best = {
        value: candidate,
        score: scored.score,
        strategy,
        matchedTokens: [scored.details],
      }
    }
  }
  if (!best || best.score < minConfidence) return null
  return best
}

export function compareWakeWord(
  input: string,
  wake: { canonical: string; aliases?: string[] },
  opts: FuzzyMatchOpts = {},
): MatchResult | null {
  const { canonical, aliases = [] } = wake
  const candidates = [canonical, ...aliases]
  const strategy = opts.strategy ?? 'hybrid'
  const minConfidence = opts.minConfidence ?? 0.75
  const locale = opts.locale ?? 'es'
  const tokenScores = tokenizeAndScore(input, candidates, {
    strategy,
    minConfidence,
    locale,
    maxCandidates: 1,
  })
  if (tokenScores.length === 0) return null
  const bestToken = tokenScores.reduce((acc, item) => (item.score > acc.score ? item : acc))
  if (bestToken.score < minConfidence) return null
  return {
    value: bestToken.candidate,
    score: bestToken.score,
    strategy,
    matchedTokens: [bestToken],
  }
}

export function tokenizeAndScore(
  input: string,
  candidates: string[],
  opts: FuzzyMatchOpts = {},
): TokenScore[] {
  const {
    strategy = 'hybrid',
    locale = 'es',
    maxCandidates = DEFAULT_MAX_CANDIDATES,
    minConfidence = 0,
  } = opts
  const tokens = input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return []
  const results: TokenScore[] = []
  tokens.forEach((token, index) => {
    const perCandidate = candidates
      .map((candidate) => {
        const { score, via } = scoreByStrategy(token, candidate, strategy, locale)
        return { token, candidate, score, via, index }
      })
      .filter((item) => item.score > 0 && item.score >= minConfidence)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates)
    results.push(...perCandidate)
  })
  return results
}
