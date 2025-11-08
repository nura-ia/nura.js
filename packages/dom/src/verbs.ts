import type { NuraVerb } from "@nura/core"

export const KNOWN_NURA_VERBS = [
  "open",
  "close",
  "toggle",
  "create",
  "update",
  "delete",
  "navigate",
  "focus",
  "speak",
  "custom",
] as const satisfies readonly NuraVerb[]

const KNOWN_VERB_SET = new Set<NuraVerb>(KNOWN_NURA_VERBS)

export const toNuraVerb = (value: string): NuraVerb =>
  KNOWN_VERB_SET.has(value as NuraVerb) ? (value as NuraVerb) : "custom"

export const parseVerbList = (verbsAttr: string | null): NuraVerb[] =>
  verbsAttr
    ? verbsAttr
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((verb) => toNuraVerb(verb))
    : []
