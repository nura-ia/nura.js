import type { NuraVerb } from '@nura-js/core'

export const KNOWN_NURA_VERBS = [
  'open',
  'close',
  'toggle',
  'create',
  'update',
  'delete',
  'filter',
  'set',
  'navigate',
  'focus',
  'view',
  'hover',
  'speak',
  'custom',
  'click',
  'reset',
  'increment',
] as const satisfies readonly NuraVerb[]

const KNOWN_VERB_SET = new Set<NuraVerb>(KNOWN_NURA_VERBS)

export const toNuraVerb = (value: string): NuraVerb =>
  KNOWN_VERB_SET.has(value as NuraVerb) ? (value as NuraVerb) : 'custom'

export const parseVerbList = (value: string | null): NuraVerb[] =>
  value
    ? value
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(toNuraVerb)
    : []
