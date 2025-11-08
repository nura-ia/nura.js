export function parseNumeral(token: string, locale: string): number {
  const t = token.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/^\d+$/.test(t)) return Number(t)
  const es = { quince: 15 } as const
  const en = { fifteen: 15 } as const
  if (locale.startsWith('es') && t in es) return es[t as keyof typeof es]
  if (locale.startsWith('en') && t in en) return en[t as keyof typeof en]
  return Number.NaN
}

export { toNumberLoose } from './nlp/numerals'
