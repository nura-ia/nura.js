export function detectLocale(content: string, candidates: string[]): string {
  const s = content.toLowerCase()
  if (/(\b(open|delete|order|menu|please|remove)\b)/.test(s)) return 'en'
  if (/(\b(abr(e|ir)|elimina(r)|borra(r)?|orden(es)?|pedido(s)?|menú|menu)\b)/.test(s)) return 'es'
  return candidates[0] || 'es'
}
