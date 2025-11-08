import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js'
import { emitTelemetry } from '../telemetry.js'

export type McpTransport = {
  kind: 'ws'
  url: string
  headers?: Record<string, string>
}

type McpClient = Client

let client: McpClient | undefined

const CLIENT_INFO = {
  name: 'nura-vue-demo',
  version: '0.1.0',
}

function asUrl(raw: string): URL {
  try {
    return new URL(raw, window.location.href)
  } catch (error) {
    throw new Error(`URL de MCP inválida: ${raw}`)
  }
}

export function sanitizeToolArgs(
  args?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!args) return undefined

  const sanitize = (value: unknown): unknown => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item)).filter((item) => item !== undefined)
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    if (typeof value === 'object') {
      const output: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const sanitized = sanitize(val)
        if (sanitized !== undefined) {
          output[key] = sanitized
        }
      }
      return output
    }

    return undefined
  }

  const sanitized = sanitize(args)
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return undefined
  }

  return sanitized as Record<string, unknown>
}

function ensureClient(): McpClient {
  if (!client) {
    throw new Error('Cliente MCP no conectado')
  }
  return client
}

export async function mcpConnect(transport: McpTransport): Promise<McpClient> {
  if (transport.kind !== 'ws') {
    throw new Error(`Transporte MCP no soportado: ${transport.kind}`)
  }

  const url = asUrl(transport.url)

  if (client) {
    await client.close().catch(() => undefined)
    client = undefined
  }

  const wsTransport = new WebSocketClientTransport(url)
  const nextClient = new Client(CLIENT_INFO, {
    debouncedNotificationMethods: ['notifications/resources/list_changed'],
  }) as McpClient

  nextClient.fallbackNotificationHandler = async (notification) => {
    emitTelemetry('mcp.event', notification)
  }

  nextClient.onclose = () => {
    emitTelemetry('mcp.client.disconnected', { url: url.toString() })
    if (client === nextClient) {
      client = undefined
    }
  }

  nextClient.onerror = (error) => {
    emitTelemetry('mcp.client.error', {
      message: error.message,
    })
  }

  emitTelemetry('mcp.client.connecting', { url: url.toString() })

  try {
    await nextClient.connect(wsTransport)
  } catch (error) {
    client = undefined
    emitTelemetry('mcp.client.error', {
      message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  client = nextClient
  emitTelemetry('mcp.client.connected', { url: url.toString() })
  return nextClient
}

export function mcpIsConnected(): boolean {
  return Boolean(client?.transport)
}

export async function mcpListResources(): Promise<any[]> {
  const current = ensureClient()
  const result = await current.listResources({})
  return result.resources
}

export async function mcpListTools(): Promise<any[]> {
  const current = ensureClient()
  const result = await current.listTools({})
  return result.tools
}

export async function mcpCallTool(
  name: string,
  args?: Record<string, unknown>,
): Promise<any> {
  const current = ensureClient()
  const payload = sanitizeToolArgs(args)
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now()

  try {
    const result = await current.callTool({ name, arguments: payload })
    const finished = typeof performance !== 'undefined' ? performance.now() : Date.now()
    emitTelemetry('mcp.tool.called', {
      name,
      args: payload,
      ms: Math.round(finished - started),
    })
    return result
  } catch (error) {
    const finished = typeof performance !== 'undefined' ? performance.now() : Date.now()
    emitTelemetry('mcp.tool.error', {
      name,
      args: payload,
      ms: Math.round(finished - started),
      message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
