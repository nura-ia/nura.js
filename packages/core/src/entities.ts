import {
  parseBoolean as parseBooleanInternal,
  parseEnum as parseEnumInternal,
  parseDate as parseDateInternal,
  parseRangeNumber as parseRangeNumberInternal,
} from './entities/parsers'
export type { ParseCtx } from './entities/types'
export const parseBoolean = parseBooleanInternal
export const parseEnum = parseEnumInternal
export const parseDate = parseDateInternal
export const parseRangeNumber = parseRangeNumberInternal

export function parseNumber(raw: string): number | undefined {
  const normalized = raw.replace(/\s+/g, '').replace(/,/g, '.')
  const m = normalized.replace(/[^\d.-]/g, '')
  if (!m || m === '-' || m === '.' || m === '-.' || m === '.-' ) return undefined
  const n = Number(m)
  return Number.isFinite(n) ? n : undefined
}
 
export function defaultFormat(val: unknown): string {
  if (val == null) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
