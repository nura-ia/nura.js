declare module '@nura-js/intents' {
  export interface NIntent {
    type: string
    payload: unknown
    uiHint?: { open?: boolean; target?: string; focus?: string }
    context?: {
      locale?: string
      tenant?: string
      user?: string
      roles?: string[]
      [key: string]: unknown
    }
  }
  export interface NIntentResponse {
    intentId: string
    id?: string
    status: 'queued' | 'requires_approval' | 'done'
    message?: string
    result?: { type: string; payload: unknown; uiHint?: NIntent['uiHint'] }
  }
  export interface IdempotencyStore {
    get(key: string): Promise<NIntentResponse | null>
    set(key: string, response: NIntentResponse, ttlSeconds: number): Promise<void>
  }
  export interface RateLimiter {
    check(key: string): Promise<boolean>
  }
  export class IntentError extends Error {
    readonly code: string
    readonly status: number
    readonly details?: unknown
  }
  export class IntentService {
    createIntent(intent: NIntent): Promise<NIntentResponse>
    approveIntent(intentId: string): Promise<NIntentResponse>
    getIntent(intentId: string): Promise<NIntentResponse>
  }
  export class NoopRateLimiter implements RateLimiter {
    check(key: string): Promise<boolean>
  }
  export const intentService: IntentService
}
