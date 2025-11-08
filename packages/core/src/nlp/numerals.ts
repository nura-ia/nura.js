const ES_NUM: Record<string, number> = {
  cero: 0,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintidós: 22,
  veintitres: 23,
  veintitrés: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintiséis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
}

const EN_NUM: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export function toNumberLoose(str: string, locale: 'es' | 'en'): number | null {
  const cleaned = normalize(str)
  if (!cleaned) return null
  const digitMatch = cleaned.match(/-?\d+(?:[.,]\d+)?/)
  if (digitMatch) {
    const value = Number(digitMatch[0].replace(',', '.'))
    if (Number.isFinite(value)) return value
  }
  const dict = locale === 'es' ? ES_NUM : EN_NUM
  if (dict[cleaned] != null) return dict[cleaned]!
  const tokens = cleaned.split(/\s+|-/).filter(Boolean)
  let accum: number | null = null
  for (const token of tokens) {
    if (dict[token] != null) {
      accum = (accum ?? 0) + dict[token]!
    }
  }
  if (accum != null) return accum
  for (const [word, value] of Object.entries(dict)) {
    if (cleaned.includes(word)) return value
  }
  return null
}
