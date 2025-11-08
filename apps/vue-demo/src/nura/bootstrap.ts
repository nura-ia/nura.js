import type { NAction, NContext, NResult, Nura } from '@nura/core'
import { emitTelemetry, getTelemetryHistory, onTelemetry, type TelemetryEventRecord } from './telemetry.js'
import { maybeRunMcp } from './mcp/registry.js'
import { mcpIsConnected } from './mcp/client.js'

type ActResult = Promise<NResult & { via?: 'mcp' | 'local'; result?: unknown }>

type TelemetryApi = {
  history: () => TelemetryEventRecord[]
  on: (handler: (event: TelemetryEventRecord) => void) => () => void
  emit: typeof emitTelemetry
}

type WindowNuraBridge = {
  act: (action: NAction) => ActResult
  registry: NContext['registry']
  telemetry: TelemetryApi
  ctx: NContext
  isMcpConnected: () => boolean
}

declare global {
  interface Window {
    __nura?: WindowNuraBridge
  }
}

function withTelemetry(action: NAction, via: 'mcp' | 'local', result: unknown): void {
  emitTelemetry('nura.act.completed', {
    action,
    via,
    result,
  })
}

export function installNuraBridge(nura: Nura, ctx: NContext): void {
  const win = window as Window
  const originalAct = nura.act.bind(nura)

  const act = async (action: NAction): ActResult => {
    emitTelemetry('nura.act.requested', { action })

    try {
      const mcpResult = await maybeRunMcp(action)
      if (mcpResult !== undefined) {
        withTelemetry(action, 'mcp', mcpResult)
        return { ok: true, via: 'mcp', result: mcpResult }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      emitTelemetry('mcp.tool.error', { action, message })
      // eslint-disable-next-line no-console
      console.error('[nura][mcp] error ejecutando tool', error)
    }

    const fallback = await originalAct(action)
    withTelemetry(action, 'local', fallback)
    return { ...fallback, via: 'local' as const }
  }

  ;(nura as unknown as { act(action: NAction): ActResult }).act = act

  const telemetry: TelemetryApi = {
    history: () => getTelemetryHistory(),
    on: onTelemetry,
    emit: emitTelemetry,
  }

  win.__nura = {
    act,
    registry: ctx.registry,
    telemetry,
    ctx,
    isMcpConnected: () => mcpIsConnected(),
  }
}
