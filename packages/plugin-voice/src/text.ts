import type { NContext, NLocale } from '@nura/core'

export function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function normalizeUtterance(
  ctx: NContext,
  text: string,
  localeOverride?: NLocale,
): string {
  const locale = localeOverride ?? ctx.registry.i18n.getLocale()
  const tokens = text
    .trim()
    .split(/\s+/g)
    .filter((part) => part.length > 0)
  if (tokens.length === 0) return ''
  return tokens
    .map((tok) => {
      const canonical = ctx.registry.lexicon.normalize(locale, tok) ?? tok
      return stripDiacritics(canonical.toLowerCase())
    })
    .join(' ')
}

export function tokensForWeight(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
}
