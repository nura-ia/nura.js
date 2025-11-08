import type { NActionSpec, NLocale } from '../types'

function localeCandidates(locale: NLocale): NLocale[] {
  const list: NLocale[] = [locale]
  const base = locale.split('-')[0]
  if (!list.includes(base)) list.push(base)
  return list
}

export function collectCommandVariants(spec: NActionSpec, locale: NLocale): string[] {
  const candidates = localeCandidates(locale)
  const phrases = new Set<string>()
  for (const loc of candidates) {
    const pack = spec.phrases[loc]
    if (!pack) continue
    for (const phrase of pack.canonical ?? []) phrases.add(phrase)
    for (const variant of pack.synonyms ?? []) phrases.add(variant)
  }
  const aliasCommands = spec.aliases?.commands ?? []
  for (const alias of aliasCommands) {
    if (!candidates.includes(alias.locale)) continue
    for (const variant of alias.variants) {
      phrases.add(variant)
    }
  }
  return [...phrases]
}

export function collectEntityVariants(
  spec: NActionSpec,
  entityName: string,
  base: string[] = [],
): string[] {
  const all = new Set(base)
  const aliases = spec.aliases?.entities?.[entityName] ?? []
  for (const variant of aliases) {
    all.add(variant)
  }
  return [...all]
}

export function collectWakeVariants(spec: NActionSpec): string[] {
  return [...(spec.aliases?.wake ?? [])]
}
