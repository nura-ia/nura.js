import type {
  NActionSpecMeta,
  NAgent,
  NContext,
  NActionSpec,
  NEntityDef,
  NLocale,
  NAction,
  ModernNAction,
  NI18n,
  NLexicon,
} from '@nura/core'
import {
  collectCommandVariants,
  collectEntityVariants,
  collectWakeVariants,
  parseBoolean,
  parseDate,
  parseEnum,
  parseNumber,
  parseRangeNumber,
} from '@nura/core'
import { toNumberLoose } from '@nura/core/numerals'

import { matchUtterance } from './matchUtterance'
import { normalizeUtterance } from './text'
import { detectWake, normalizeWakeWords, stripWake } from './wake'
import type { NIntent, NVoiceOptions, WakeWordInput } from './types'

type SpeechRecognitionResultAlternative = { transcript?: string }
type SpeechRecognitionResult = ArrayLike<SpeechRecognitionResultAlternative>
type NuraSpeechRecognitionEvent = {
  results?: ArrayLike<SpeechRecognitionResult>
}

type NuraSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: NuraSpeechRecognitionEvent) => void) | null
  onerror: ((event: unknown) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => NuraSpeechRecognition

type VoiceActionSpec = Omit<NActionSpec, 'meta'> & {
  meta?: NActionSpecMeta
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
}

function getWindow(): (Window & typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}) | undefined {
  if (typeof window === 'undefined') return undefined
  return window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

function slotPattern(ent: NEntityDef): RegExp {
  if (ent.pattern) return ent.pattern
  switch (ent.type) {
    case 'number':
      return /(\d+(?:[.,]\d+)?|[a-zA-Záéíóúñ]+)/
    case 'boolean':
      return /([a-zA-Záéíóúñ]+)/
    case 'enum':
      return /([a-zA-Z0-9_\-áéíóúñ]+)/
    case 'date':
      return /([\wáéíóúñ\-]+)/
    case 'range_number':
      return /([\w\s\-\–\—]+)/
    case 'string':
    default:
      return /(.+?)/
  }
}

function baseLocale(locale: NLocale): 'es' | 'en' {
  return locale.startsWith('en') ? 'en' : 'es'
}

function parseByType(
  raw: string,
  ent: NEntityDef,
  ctx: { locale: NLocale; i18n: NI18n; lexicon: NLexicon },
  synonyms: string[] = [],
): unknown {
  if (ent.parse) return ent.parse(raw, ctx)
  const localeBase = baseLocale(ctx.locale)
  switch (ent.type) {
    case 'string':
      return raw.trim()
    case 'number': {
      const parsed = parseNumber(raw)
      if (parsed != null) return parsed
      return toNumberLoose(raw, localeBase)
    }
    case 'enum': {
      const variants = [...new Set([...(ent.options ?? []), ...synonyms])]
      if (variants.length === 0) return raw.trim().toLowerCase()
      return parseEnum(raw, variants, { locale: ctx.locale })
    }
    case 'boolean':
      return parseBoolean(raw, { locale: ctx.locale })
    case 'date':
      return parseDate(raw, { locale: ctx.locale })
    case 'range_number':
      return parseRangeNumber(raw, { locale: ctx.locale })
    default:
      return raw
  }
}

function getActiveLocale(ctx: NContext, explicit?: NLocale): NLocale {
  return explicit ?? ctx.registry.i18n.getLocale()
}

function isModernAction(action: NAction): action is ModernNAction {
  return 'type' in action
}

function getActionMeta(action: NAction): {
  confidence?: number
  via?: string
} {
  if (isModernAction(action) && action.meta && typeof action.meta === 'object') {
    const confidence =
      typeof action.meta.confidence === 'number' ? action.meta.confidence : undefined
    const via = typeof action.meta.via === 'string' ? action.meta.via : undefined
    return { confidence, via }
  }

  return {}
}

/** Simple locale detection using heuristic token scoring. */
export function detectLocale(text: string, candidates: NLocale[]): NLocale {
  const lower = text.toLowerCase()

  const score: Record<NLocale, number> = {}
  const uniqueCandidates = Array.from(new Set(candidates))
  for (const loc of uniqueCandidates) score[loc] = 0

  const esHints = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'que', 'por', 'con', 'sí', 'no']
  const enHints = ['the', 'of', 'for', 'to', 'in', 'yes', 'no', 'open', 'delete']

  for (const tok of lower.split(/\s+/)) {
    if (esHints.includes(tok)) score['es' as NLocale] = (score['es' as NLocale] ?? 0) + 1
    if (enHints.includes(tok)) score['en' as NLocale] = (score['en' as NLocale] ?? 0) + 1
    if (/[ñáéíóú]/.test(tok)) score['es' as NLocale] = (score['es' as NLocale] ?? 0) + 2
    if (/[a-z]/.test(tok) && !/[ñáéíóú]/.test(tok)) score['en' as NLocale] = (score['en' as NLocale] ?? 0) + 1
  }

  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? (best[0] as NLocale) : uniqueCandidates[0]
}

function phraseToRegExp(phrase: string, entities?: NEntityDef[]) {
  const trimmed = phrase.trim()
  if (!entities || entities.length === 0) {
    const simple = '^' + escapeRegex(trimmed) + '$'
    return new RegExp(simple, 'i')
  }

  const placeholder = /\{([^}]+)\}/g
  let lastIndex = 0
  let pattern = '^'
  let match: RegExpExecArray | null
  while ((match = placeholder.exec(trimmed)) !== null) {
    const before = trimmed.slice(lastIndex, match.index)
    pattern += escapeRegex(before)
    const name = match[1]
    const entity = entities.find((ent) => ent.name === name)
    const slot = entity ? slotPattern(entity) : /(.+?)/
    pattern += slot.source
    lastIndex = placeholder.lastIndex
  }
  pattern += escapeRegex(trimmed.slice(lastIndex))
  pattern += '$'

  return new RegExp(pattern, 'i')
}

export function deriveIntentsFromSpecs(
  specs: VoiceActionSpec[],
  ctx: NContext,
  locale: NLocale,
): NIntent[] {
  const intents: NIntent[] = []
  const lexicon = ctx.registry.lexicon
  const localeBase = baseLocale(locale)
  for (const spec of specs) {
    const phrases = collectCommandVariants(spec, locale)
    if (phrases.length === 0) continue

    const entitySynonyms: Record<string, string[]> = {}
    if (spec.entities) {
      for (const ent of spec.entities) {
        const variants = collectEntityVariants(spec, ent.name, ent.options ?? [])
        entitySynonyms[ent.name] = variants
        for (const alias of variants) {
          if (ent.options && ent.options.length > 0) {
            lexicon.registerPhonetic(localeBase, alias, ent.options[0]!)
          }
        }
      }
    }

    const wakeAliases = collectWakeVariants(spec)
    for (const alias of wakeAliases) {
      lexicon.registerPhonetic(localeBase, alias, alias)
    }

    for (const phrase of phrases) {
      const normalized = normalizeUtterance(ctx, phrase, locale)
      const normalizedForSimilarity = normalized
        .replace(/\{[^}]+\}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const rx = phraseToRegExp(phrase, spec.entities)
      const tokens = normalizedForSimilarity ? normalizedForSimilarity.split(/\s+/) : normalized.split(/\s+/)
      intents.push({
        name: `${spec.name}:${phrase}`,
        match: rx,
        phrase,
        normalizedPhrase: normalizedForSimilarity || normalized,
        entities: spec.entities,
        entitySynonyms,
        confidenceThreshold: spec.meta?.confidenceThreshold,
        tokens,
        toAction: (m) => {
          const payload: Record<string, unknown> = {}
          const parseCtx = {
            locale: ctx.registry.i18n.getLocale(),
            i18n: ctx.registry.i18n,
            lexicon: ctx.registry.lexicon,
          }
          if (spec.entities && spec.entities.length) {
            let groupIdx = 1
            for (const ent of spec.entities) {
              const raw = m[groupIdx++]
              if (raw === undefined) continue
              const synonyms = entitySynonyms[ent.name] ?? []
              const value = parseByType(String(raw), ent, parseCtx, synonyms)
              if (value !== undefined) payload[ent.name] = value
            }
          }

          const finalPayload = Object.keys(payload).length ? payload : undefined

          if (spec.validate) {
            const valid = spec.validate(finalPayload)
            if (!valid) return null
          }

          return {
            type: spec.type,
            target: spec.target,
            payload: finalPayload,
            meta: {
              desc: phrase,
              confidenceThreshold: spec.meta?.confidenceThreshold,
              requireConfirm: spec.meta?.requireConfirm,
            },
          }
        },
      })
    }
  }
  return intents
}

function getSpecsFromCtx(ctx: NContext): VoiceActionSpec[] {
  try {
    return ctx.registry.actions.listSpecs()
  } catch {
    return []
  }
}

function gatherWakeInputs(
  base: WakeWordInput[] | undefined,
  specs: VoiceActionSpec[],
): WakeWordInput[] {
  const inputs: WakeWordInput[] = [...(base ?? [])]
  for (const spec of specs) {
    for (const alias of collectWakeVariants(spec)) {
      inputs.push(alias)
    }
  }
  return inputs
}

export function voiceAgent(opts: NVoiceOptions = {}): NAgent {
  const explicitLocale = opts.language as NLocale | undefined
  const key = opts.keyWake ?? 'F2'

  function createRecognizer(ctx: NContext) {
    const speechWindow = getWindow()
    if (!speechWindow) return null
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return null
    const rec = new SpeechRecognitionCtor()
    rec.lang = getActiveLocale(ctx, explicitLocale)
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (ev: NuraSpeechRecognitionEvent) => {
      const t = ev.results?.[0]?.[0]?.transcript ?? ''
      handleTranscript(t, ctx)
    }
    rec.onerror = () => undefined
    rec.onend = () => undefined
    return rec
  }

  function handleTranscript(text: string, ctx: NContext) {
    const tel = ctx.registry.telemetry
    tel.emit('voice.input', { textOriginal: text })

    const specs = getSpecsFromCtx(ctx)
    const wakeInputs = gatherWakeInputs(opts.wakeWords, specs)
    const wakeEntries = normalizeWakeWords(wakeInputs)

    const wakeLocale = baseLocale(ctx.registry.i18n.getLocale())
    const wakeDetection = detectWake(text, wakeEntries, wakeLocale)
    tel.emit('voice.wake.fuzzy', {
      input: text,
      matchedAlias: wakeDetection.result?.value ?? null,
      confidence: wakeDetection.result?.score ?? 0,
      via: wakeDetection.result ? wakeDetection.result.strategy : 'none',
    })
    if (!wakeDetection.matched) return

    const content = stripWake(text, wakeDetection.result)
    if (!content.trim()) return

    const activeLocale = getActiveLocale(ctx, explicitLocale)
    const langCandidates: NLocale[] = []
    langCandidates.push(activeLocale)
    const base = activeLocale.split('-')[0] as NLocale
    if (!langCandidates.includes(base)) langCandidates.push(base)
    for (const fallback of ['es', 'en'] as const) {
      if (!langCandidates.includes(fallback)) langCandidates.push(fallback)
    }

    const detected = detectLocale(content, langCandidates)
    tel.emit('voice.locale.detected', { detected, candidates: langCandidates })
    ctx.registry.i18n.setLocale(detected)

    const derived = deriveIntentsFromSpecs(specs, ctx, detected)
    tel.emit('voice.intents.derived', { count: derived.length, locale: detected })
    const intents = [...(opts.intents ?? []), ...derived]

    const action = matchUtterance(ctx, content, intents, {
      fuzzy: true,
      threshold: 0.82,
      wakeConfidence: wakeDetection.result?.score ?? 1,
      wakeVia: wakeDetection.result?.matchedTokens?.[0]?.via ?? 'none',
      devMode: opts.devMode ?? false,
    })

    if (action) {
      const meta = getActionMeta(action)
      tel.emit('voice.intent.selected', {
        action,
        locale: detected,
        textOriginal: content,
        confidence: meta.confidence ?? 0,
        via: meta.via ?? 'unknown',
      })
      if (!opts.devMode) {
        void ctx.act(action)
      }
    } else {
      tel.emit('voice.intent.rejected', {
        textOriginal: content,
        locale: detected,
        reason: 'below_threshold_or_no_match',
      })
    }
  }

  let rec: NuraSpeechRecognition | null = null

  return {
    id: 'voice',
    kind: 'voice',
    start(ctx: NContext) {
      const win = getWindow()
      if (!win) return

      rec = createRecognizer(ctx)

      win.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === key) {
          const promptResult = win.prompt?.('[Nura voice] Say something… (dev mock)') ?? ''
          if (promptResult) handleTranscript(promptResult, ctx)
        }
      })

      if (opts.autoStart && rec) {
        try {
          rec.start()
        } catch (error) {
          void error
        }
      }
    },
    stop() {
      try {
        rec?.stop()
      } catch (error) {
        void error
      }
      rec = null
    },
  }
}

export { matchUtterance } from './matchUtterance'
export { detectWake, normalizeWakeWords, stripWake } from './wake'
export { compareWakeWord } from '@nura/core/wake'
export type { NIntent, NVoiceOptions } from './types'
