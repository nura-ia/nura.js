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
}
