export const parseBoolean = (_raw: string): boolean | undefined => undefined
export const parseEnum = (_raw: string): string | undefined => undefined
export const parseDate = (_raw: string): Date | undefined => undefined
export const parseRangeNumber = (_raw: string): number | undefined => undefined
export const parseNumber = (raw: string): number | undefined => { const value = Number(raw); return Number.isFinite(value) ? value : undefined }
export const defaultFormat = (value: unknown): string => String(value ?? '')
