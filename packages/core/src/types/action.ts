export type NActionMeta = {
  /** Require an explicit user or policy confirmation before dispatch. */
  requireConfirm?: boolean
  /** Generic permission hints retained for adapter compatibility. */
  permissions?: string[] | string
  /** Ranking priority hint. */
  priority?: 'soft' | 'normal' | 'hard'
  /** Human-readable description for tools, telemetry, and UI. */
  desc?: string
  /** Confidence calculated by an adapter. */
  confidence?: number
  /** Match origin used by voice and language adapters. */
  via?: 'exact' | 'phonetic' | 'global'
  /** Wake-word match origin. */
  wakeVia?: string
  /** Suggested fuzzy matching threshold. */
  confidenceThreshold?: number
  /** Expose this action through the agent bridge. Defaults to false. */
  agent?: boolean
  /** Optional JSON Schema used to describe model tool arguments. */
  inputSchema?: Record<string, unknown>
  /** Entity names that must be present in model tool arguments. */
  requiredEntities?: string[]
  /** Name of the agent tool that initiated this action. */
  agentTool?: string
  /** Provider or adapter that initiated this action. */
  agentProvider?: string
  [key: string]: unknown
}

export type NActionSpecMeta = NActionMeta
