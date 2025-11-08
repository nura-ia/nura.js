import { compareWakeWord } from '@nura/core/wake'
import type { MatchResult } from '@nura/plugin-fuzzy'

import type { WakeWordConfig, WakeWordInput } from './types'

type WakeEntry = {
  canonical: string
  aliases: string[]
  minConfidence: number
}

type WakeDetection = {
  matched: boolean
  result: MatchResult | null
  entry?: WakeEntry
}

const DEFAULT_CONFIDENCE = 0.75
const FILLER_WORDS = new Set(['ok', 'oye', 'hey', 'hola', 'eh', 'ey'])

export function normalizeWakeWords(inputs: WakeWordInput[] | undefined): WakeEntry[] {
  if (!inputs || inputs.length === 0) return []
  return inputs.map((item) => {
    if (typeof item === 'string') {
      const trimmed = item.trim()
      const tokens = trimmed.split(/\s+/)
      const aliases = tokens.length > 1 ? [tokens[tokens.length - 1]] : []
      return {
        canonical: trimmed,
        aliases,
        minConfidence: DEFAULT_CONFIDENCE,
      }
    }
    const config: WakeWordConfig = item
    return {
      canonical: config.canonical,
      aliases: config.aliases ?? [],
      minConfidence: config.minConfidence ?? DEFAULT_CONFIDENCE,
    }
  })
}

export function detectWake(
  input: string,
  entries: WakeEntry[],
  locale: 'es' | 'en',
): WakeDetection {
  if (entries.length === 0) return { matched: true, result: null }
  let best: { entry: WakeEntry; result: MatchResult } | null = null
  for (const entry of entries) {
    const rawResult = compareWakeWord(input, entry, {
      locale,
      minConfidence: entry.minConfidence,
      strategy: 'hybrid',
      maxCandidates: 3,
    })
    if (rawResult && rawResult.score >= entry.minConfidence) {
      const normalized: MatchResult = {
        value: rawResult.value ?? entry.canonical,
        score: rawResult.score,
        strategy: (rawResult.strategy ?? 'hybrid') as MatchResult['strategy'],
        matchedTokens: (rawResult as MatchResult).matchedTokens,
      }
      if (!best || normalized.score > best.result.score) {
        best = { entry, result: normalized }
      }
    }
  }
  if (!best) return { matched: false, result: null }
  return { matched: true, result: best.result, entry: best.entry }
}

export function stripWake(input: string, result: MatchResult | null): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (!result) return trimmed

  const tokens = tokenizeWithOffsets(trimmed)
  if (tokens.length === 0) return trimmed

  const indexes = (result.matchedTokens ?? [])
    .map((entry) => entry.index)
    .filter((idx): idx is number => typeof idx === 'number' && idx >= 0 && idx < tokens.length)

  let start: number | null = null
  let end: number | null = null
  let leftIndex: number | null = null
  let rightIndex: number | null = null

  if (indexes.length > 0) {
    indexes.sort((a, b) => a - b)
    leftIndex = indexes[0]!
    rightIndex = indexes[indexes.length - 1]!
    start = tokens[leftIndex].start
    end = tokens[rightIndex].end
  } else {
    const value = (result.value ?? '').trim().toLowerCase()
    if (value) {
      const lower = trimmed.toLowerCase()
      const found = lower.indexOf(value)
      if (found >= 0) {
        start = found
        end = found + value.length
        leftIndex = tokens.findIndex(
          (token) => token.start <= found && token.end >= found,
        )
        if (leftIndex === -1) {
          leftIndex = tokens.findIndex((token) => token.start >= found)
        }
        if (leftIndex !== -1) {
          for (let i = tokens.length - 1; i >= leftIndex; i--) {
            if (tokens[i]!.start < (end ?? 0)) {
              rightIndex = i
              break
            }
          }
        }
      }
    }
  }

  if (start == null || end == null) return trimmed

  let startIndex = start
  let endIndex = end

  if (leftIndex == null || leftIndex < 0) {
    leftIndex = tokens.findIndex((token) => token.start >= startIndex)
  }
  if (leftIndex < 0) leftIndex = 0

  if (rightIndex == null || rightIndex < 0) {
    for (let i = tokens.length - 1; i >= leftIndex; i--) {
      if (tokens[i]!.end > startIndex) {
        rightIndex = i
        break
      }
    }
  }
  if (rightIndex == null || rightIndex < leftIndex) {
    rightIndex = leftIndex
  }

  while (leftIndex > 0 && isFiller(tokens[leftIndex - 1]!.token)) {
    leftIndex -= 1
    startIndex = tokens[leftIndex]!.start
  }

  while (endIndex < trimmed.length) {
    const char = trimmed.charAt(endIndex)
    if (!/[\s,.;:!?¡¿-]/.test(char)) {
      break
    }
    endIndex += 1
  }

  const before = trimmed.slice(0, startIndex).trim()
  const after = trimmed.slice(endIndex).trim()
  if (!before) return after
  if (!after) return before
  return `${before} ${after}`.replace(/\s+/g, ' ').trim()
}

function tokenizeWithOffsets(input: string): Array<{ token: string; start: number; end: number }> {
  const result: Array<{ token: string; start: number; end: number }> = []
  const regex = /[^\s]+/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(input)) !== null) {
    result.push({ token: match[0]!, start: match.index, end: match.index + match[0]!.length })
  }
  return result
}

function isFiller(token: string): boolean {
  return FILLER_WORDS.has(token.toLowerCase())
}
