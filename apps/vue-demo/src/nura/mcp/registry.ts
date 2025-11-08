import type { NAction } from '@nura/core'
import { mcpCallTool, mcpIsConnected, sanitizeToolArgs } from './client.js'

export const NURA_TO_MCP: Record<
  string,
  {
    tool: string
    args?: (payload?: any) => Record<string, unknown> | undefined
  }
> = {
  'open::menu:orders': {
    tool: 'filesystem.readFile',
    args: () => ({ path: './data/orders.json' }),
  },
  'delete::order': {
    tool: 'orders.delete',
    args: (payload) => ({ id: payload?.id }),
  },
}

function createActionKey(action: NAction): string | undefined {
  if ('type' in action) {
    const target = action.target ?? 'default'
    return `${action.type}::${target}`
  }

  if ('verb' in action) {
    return `${action.verb}::${action.scope ?? 'default'}`
  }

  return undefined
}

export async function maybeRunMcp(action: {
  type?: string
  target?: string
  payload?: unknown
  verb?: string
  scope?: string
  metadata?: unknown
}): Promise<unknown | undefined> {
  const key = createActionKey(action as NAction)
  if (!key) return undefined

  const mapping = NURA_TO_MCP[key]
  if (!mapping) return undefined
  if (!mcpIsConnected()) return undefined

  const basePayload = 'payload' in action ? action.payload : 'metadata' in action ? action.metadata : undefined
  const rawArgs = mapping.args ? mapping.args(basePayload) : undefined
  const safeArgs = sanitizeToolArgs(rawArgs)

  if (mapping.args && (!safeArgs || Object.keys(safeArgs).length === 0)) {
    throw new Error('Argumentos MCP inválidos para la herramienta configurada')
  }

  return mcpCallTool(mapping.tool, safeArgs)
}
