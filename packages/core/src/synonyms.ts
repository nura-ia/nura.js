export function normalizeSynonyms(s: string, locale: string): string {
  let out = s
  if (locale.startsWith('es')) {
    out = out.replace(/\bpedidos\b/g, 'ordenes')
  }
  return out
}
