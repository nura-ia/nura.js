declare module '@nura-js/core' {
  export type NuraVerb =
    | 'open' | 'close' | 'toggle' | 'create' | 'update' | 'delete'
    | 'filter' | 'set' | 'navigate' | 'focus' | 'view' | 'hover'
    | 'speak' | 'custom' | 'click' | 'reset' | 'increment'
  export type NuraScope = string
  export interface NuraElement {
    id: string
    scope: NuraScope
    verbs: NuraVerb[]
    element: Element
    metadata?: Record<string, unknown>
  }
}
