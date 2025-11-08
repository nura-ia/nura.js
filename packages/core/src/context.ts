import type { NAction as CoreAction } from './types'

export type ContextAction = CoreAction & {
  type: 'open' | 'delete' | string
  target: string
  payload?: any
}

const SINGLE_WORD_CONFIRMATIONS = new Set([
  'si',
  'ok',
  'okay',
  'dale',
  'confirma',
  'confirmo',
  'yes',
  'yeah',
  'please',
  'eliminala',
  'eliminarla',
])

const MULTI_WORD_CONFIRMATIONS = ['do it', 'delete it', 'remove it']

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export class ContextManager {
  private last: ContextAction | null = null

  save(action: ContextAction): void {
    this.last = action
  }

  getLast(): ContextAction | null {
    return this.last
  }

  maybeConfirm(utter: string): ContextAction | null {
    if (!this.last) return null
    const normalized = normalize(utter)
    if (!normalized) return null

    const tokens = normalized.split(' ')
    const hasSingleWord = tokens.some((token) => SINGLE_WORD_CONFIRMATIONS.has(token))
    const hasMultiWord = MULTI_WORD_CONFIRMATIONS.some((phrase) => normalized.includes(phrase))

    if (!hasSingleWord && !hasMultiWord) return null

    const action = this.last
    this.last = null
    return action
  }
}
