import {
  damerauLevenshteinSimilarity,
  tokenizeAndScore,
  type TokenScore,
} from '@nura/plugin-fuzzy'
import { parseBoolean, parseDate, parseNumber, parseRangeNumber } from '@nura/core'
import type { NActionSpecMeta } from '@nura/core'
import type {
  ModernNAction,
  NAction,
  NContext,
  NEntityDef,
  NLocale,
} from '@nura/core'
import { toNumberLoose } from '@nura/core/numerals'

import type {
  IntentMatchResult,
  MatchPipelineOpts,
  NIntent,
  TokenComparison,
  VoiceActionMeta,
} from './types'
import { normalizeUtterance } from './text'

const WEIGHTS = {
  wake: 0.2,
  tokens: 0.4,
  entities: 0.2,
  global: 0.2,
}

export function matchUtterance(
  ctx: NContext,
  text: string,
  intents: NIntent[],
  opts: MatchPipelineOpts = {},
): NAction | undefined {
  const original = text.trim()
  if (!original) return undefined
  const { fuzzy = true, threshold = 0.82, wakeConfidence = 1, wakeVia = 'exact', devMode = false } = opts
  const locale = ctx.registry.i18n.getLocale()
  const baseLocale = baseLocaleCode(locale)
  const normalized = normalizeUtterance(ctx, original, locale)

  const results: IntentMatchResult[] = []

  for (const intent of intents) {
    if (typeof intent.match === 'function') {
      const action = intent.match(normalized)
      if (action) {
        return annotateAction(action, { confidence: 1, via: 'exact', wakeVia })
      }
      if (normalized !== original) {
        const fallback = intent.match(original)
        if (fallback) {
          return annotateAction(fallback, { confidence: 1, via: 'exact', wakeVia })
        }
      }
      continue
    }

    const pattern = intent.match
    const tokenCandidates = intent.tokens ?? extractTokens(intent)
    const tokenComparisons = computeTokenComparisons(original, tokenCandidates, baseLocale)
    const avgTokenScore = tokenComparisons.length
      ? tokenComparisons.reduce((acc, item) => acc + item.score, 0) / tokenComparisons.length
      : 0

    const normalizedMatch = normalized.match(pattern)
    const originalMatch = normalizedMatch ? null : original.match(pattern)
    const match = normalizedMatch ?? originalMatch
    const { entityScore, entitiesParsed } = match
      ? computeEntityScore(intent, match, baseLocale)
      : { entityScore: 0, entitiesParsed: {} }

    const globalScore = intent.normalizedPhrase
      ? damerauLevenshteinSimilarity(normalized, intent.normalizedPhrase)
      : damerauLevenshteinSimilarity(normalized, pattern.source.replace(/[\\^$]/g, ''))

    const finalScore =
      WEIGHTS.wake * wakeConfidence +
      WEIGHTS.tokens * avgTokenScore +
      WEIGHTS.entities * entityScore +
      WEIGHTS.global * globalScore

    const via = resolveVia({
      avgTokenScore,
      entityScore,
      globalScore,
      hadMatch: Boolean(match),
      comparisons: tokenComparisons,
    })

    if (!fuzzy && !match) continue

    if (match && intent.toAction) {
      const action = intent.toAction(match)
      if (action) {
        const annotated = annotateAction(action, {
          confidence: finalScore,
          via,
          wakeVia,
          threshold: intent.confidenceThreshold,
        })
        results.push({
          action: annotated,
          score: finalScore,
          via,
          tokensCompared: tokenComparisons,
          entitiesParsed,
        })
        continue
      }
    }

    if (finalScore > 0) {
      const provisional = annotateAction(
        {
          type: 'custom',
          meta: { desc: intent.phrase, confidenceThreshold: intent.confidenceThreshold },
        } as NAction,
        { confidence: finalScore, via, wakeVia, threshold: intent.confidenceThreshold },
      )
      results.push({
        action: provisional,
        score: finalScore,
        via,
        tokensCompared: tokenComparisons,
        entitiesParsed,
      })
    }
  }

  if (results.length === 0) return undefined

  results.sort((a, b) => b.score - a.score)

  const best = results[0]
  const bestMeta: VoiceActionMeta | undefined = isModernAction(best.action)
    ? best.action.meta
    : undefined
  const bestSpecMeta: NActionSpecMeta | undefined = bestMeta
  const targetThreshold = bestSpecMeta?.confidenceThreshold ?? threshold
  if (best.score < targetThreshold) return undefined

  if (devMode) {
    emitDebug(ctx, original, results)
  }

  return best.action
}

function emitDebug(ctx: NContext, input: string, results: IntentMatchResult[]) {
  const ranked = results.slice(0, 5).map((entry) => ({
    intentId: isModernAction(entry.action) ? entry.action.meta?.desc ?? 'unknown' : 'unknown',
    score: entry.score,
    via: entry.via,
  }))
  const best = results[0]
  const bestMeta: VoiceActionMeta | undefined = isModernAction(best.action)
    ? best.action.meta
    : undefined
  const bestSpecMeta: NActionSpecMeta | undefined = bestMeta
  ctx.registry.telemetry.emit('voice.intent.rank.debug', {
    input,
    topK: ranked,
    tokensCompared: best.tokensCompared,
    entitiesParsed: best.entitiesParsed,
    threshold: bestSpecMeta?.confidenceThreshold ?? null,
    requireConfirm: Boolean(bestSpecMeta?.requireConfirm),
  })
}

function annotateAction(
  action: NAction,
  info: {
    confidence: number
    via: 'exact' | 'phonetic' | 'global'
    wakeVia?: string
    threshold?: number
  },
): NAction {
  if (isModernAction(action)) {
    action.meta = {
      ...action.meta,
      confidence: info.confidence,
      via: info.via,
      wakeVia: info.wakeVia,
      confidenceThreshold: info.threshold ?? action.meta?.confidenceThreshold,
    }
  }
  return action
}

function isModernAction(action: NAction): action is ModernNAction {
  return 'type' in action
}

function computeTokenComparisons(
  input: string,
  candidates: string[],
  locale: 'es' | 'en',
): TokenComparison[] {
  if (candidates.length === 0) return []
  const scores = tokenizeAndScore(input, candidates, {
    locale,
    strategy: 'hybrid',
    maxCandidates: 1,
    minConfidence: 0.4,
  })
  const grouped = new Map<number, TokenScore>()
  for (const score of scores) {
    if (score.index == null) continue
    const prev = grouped.get(score.index)
    if (!prev || score.score > prev.score) {
      grouped.set(score.index, score)
    }
  }
  const tokens = input.trim().split(/\s+/)
  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, score]) => ({
      token: tokens[index] ?? score.token,
      best: score.candidate,
      score: score.score,
      via: score.via,
    }))
}

function computeEntityScore(
  intent: NIntent,
  match: RegExpMatchArray,
  locale: 'es' | 'en',
): { entityScore: number; entitiesParsed: Record<string, unknown> } {
  if (!intent.entities || intent.entities.length === 0) {
    return { entityScore: 0, entitiesParsed: {} }
  }
  let totalScore = 0
  let counted = 0
  const parsed: Record<string, unknown> = {}
  let index = 1
  for (const ent of intent.entities) {
    const raw = match[index++]
    if (raw == null) continue
    const synonyms = intent.entitySynonyms?.[ent.name] ?? []
    const { value, confidence } = matchEntityValue(ent, raw, locale, synonyms)
    if (confidence > 0) {
      totalScore += confidence
      counted++
    }
    if (value !== undefined) parsed[ent.name] = value
  }
  return {
    entityScore: counted > 0 ? totalScore / counted : 0,
    entitiesParsed: parsed,
  }
}

function matchEntityValue(
  ent: NEntityDef,
  raw: string,
  locale: 'es' | 'en',
  candidates: string[],
): { value: unknown; confidence: number } {
  const trimmed = raw.trim()
  switch (ent.type) {
    case 'boolean': {
      const value = parseBoolean(trimmed, { locale })
      return value === undefined ? { value: undefined, confidence: 0 } : { value, confidence: 1 }
    }
    case 'number': {
      const numeric = parseNumber(trimmed)
      if (numeric != null) return { value: numeric, confidence: 1 }
      const loose = toNumberLoose(trimmed, locale)
      if (loose != null) return { value: loose, confidence: 0.85 }
      return { value: undefined, confidence: 0 }
    }
    case 'enum': {
      const options = [...new Set([...(ent.options ?? []), ...candidates])]
      if (options.length === 0) {
        return { value: trimmed, confidence: 0.4 }
      }
      const fuzzy = tokenizeAndScore(trimmed, options, {
        locale,
        strategy: 'hybrid',
        maxCandidates: 1,
        minConfidence: 0.5,
      })[0]
      if (!fuzzy) return { value: undefined, confidence: 0 }
      return { value: fuzzy.candidate, confidence: fuzzy.score }
    }
    case 'date': {
      const value = parseDate(trimmed, { locale })
      return value ? { value, confidence: 1 } : { value: undefined, confidence: 0 }
    }
    case 'range_number': {
      const value = parseRangeNumber(trimmed, { locale })
      return value ? { value, confidence: 1 } : { value: undefined, confidence: 0 }
    }
    case 'string':
    default:
      return { value: trimmed, confidence: 0.5 }
  }
}

function resolveVia(params: {
  avgTokenScore: number
  entityScore: number
  globalScore: number
  hadMatch: boolean
  comparisons: TokenComparison[]
}): 'exact' | 'phonetic' | 'global' {
  if (params.hadMatch && params.globalScore >= 0.95 && params.avgTokenScore >= 0.95) {
    return 'exact'
  }
  const phoneticHit = params.comparisons.some((item) => item.via === 'phonetic')
  if (phoneticHit || params.avgTokenScore >= 0.78 || params.entityScore >= 0.75) {
    return 'phonetic'
  }
  return 'global'
}

function extractTokens(intent: NIntent): string[] {
  if (intent.tokens) return intent.tokens
  if (intent.phrase) {
    return intent.phrase.split(/\s+/)
  }
  return []
}

function baseLocaleCode(locale: NLocale): 'es' | 'en' {
  return locale.startsWith('en') ? 'en' : 'es'
}
