import type {
  ModernNAction,
  NActionSpec,
  NEntityDef,
  NJsonSchema,
  NRegistry,
  NResult,
  NuraElement,
} from './types'

const DEFAULT_SECRET_KEY =
  /(?:authorization|cookie|password|passwd|secret|token|api[-_]?key|private[-_]?key)/i
const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export interface NuraAgentSanitizeOptions {
  maxDepth?: number
  maxArrayLength?: number
  maxStringLength?: number
  redactKey?: RegExp
  transform?: (value: unknown, key?: string) => unknown
}

export interface NuraUiContextOptions extends NuraAgentSanitizeOptions {
  maxElements?: number
  includeText?: boolean
  includeMetadata?: boolean
  maxTextLength?: number
}

export interface NuraUiContextElement {
  id: string
  scope: string
  actions: string[]
  tag?: string
  role?: string
  label?: string
  disabled?: boolean
  hidden?: boolean
  text?: string
  metadata?: unknown
}

export interface NuraAgentTool {
  name: string
  description: string
  inputSchema: NJsonSchema
  action: {
    specName: string
    specIndex: number
    type: ModernNAction['type']
    target?: string
  }
}

export interface ParsedNuraToolCall {
  id?: string
  name: string
  arguments?: unknown
}

export interface NuraAgentAdapter<TTool = unknown, TCall = unknown> {
  id: string
  formatTools(tools: NuraAgentTool[]): TTool[]
  parseToolCall(call: TCall): ParsedNuraToolCall
}

export type NuraAgentExposure =
  | 'all'
  | readonly string[]
  | ((spec: NActionSpec) => boolean)

export interface NuraAgentBridgeOptions {
  registry: NRegistry
  execute(action: ModernNAction): Promise<NResult> | NResult
  expose?: NuraAgentExposure
  context?: () => unknown | Promise<unknown>
  sanitize?: NuraAgentSanitizeOptions
  maxContextBytes?: number
  maxArgumentBytes?: number
}

export interface NuraAgentInvocation {
  callId?: string
  tool: NuraAgentTool
  action: ModernNAction
  result: NResult
}

export class NuraAgentError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'NuraAgentError'
    this.code = code
  }
}

export function sanitizeAgentValue(
  value: unknown,
  options: NuraAgentSanitizeOptions = {},
): unknown {
  const resolved = {
    maxDepth: options.maxDepth ?? 6,
    maxArrayLength: options.maxArrayLength ?? 100,
    maxStringLength: options.maxStringLength ?? 2_000,
    redactKey: options.redactKey ?? DEFAULT_SECRET_KEY,
    transform: options.transform,
  }
  const active = new WeakSet<object>()

  const visit = (input: unknown, depth: number, key?: string): unknown => {
    if (key && BLOCKED_KEYS.has(key)) return undefined

    if (key) {
      resolved.redactKey.lastIndex = 0
      if (resolved.redactKey.test(key)) return '[REDACTED]'
    }

    const transformed = resolved.transform
      ? resolved.transform(input, key)
      : input

    if (transformed === null) return null
    if (transformed === undefined) return undefined
    if (typeof transformed === 'boolean') return transformed
    if (typeof transformed === 'number') {
      return Number.isFinite(transformed) ? transformed : String(transformed)
    }
    if (typeof transformed === 'string') {
      return transformed.length <= resolved.maxStringLength
        ? transformed
        : `${transformed.slice(0, resolved.maxStringLength)}...[TRUNCATED]`
    }
    if (typeof transformed === 'bigint') return transformed.toString()
    if (typeof transformed !== 'object') return undefined
    if (transformed instanceof Date) return transformed.toISOString()
    if (transformed instanceof Error) {
      return {
        name: transformed.name,
        message: transformed.message,
      }
    }

    if (depth >= resolved.maxDepth) return '[MAX_DEPTH]'
    if (active.has(transformed)) return '[CIRCULAR]'
    active.add(transformed)

    if (Array.isArray(transformed)) {
      const output: unknown[] = []
      for (const item of transformed.slice(0, resolved.maxArrayLength)) {
        const next = visit(item, depth + 1)
        if (next !== undefined) output.push(next)
      }
      active.delete(transformed)
      return output
    }

    const prototype = Object.getPrototypeOf(transformed)
    if (prototype !== Object.prototype && prototype !== null) {
      const name =
        typeof (transformed as { constructor?: unknown }).constructor ===
          'function' &&
        ((transformed as { constructor: { name?: unknown } }).constructor
          .name as string | undefined)
      active.delete(transformed)
      return `[${name || 'Object'}]`
    }

    const output = Object.create(null) as Record<string, unknown>
    for (const [entryKey, entryValue] of Object.entries(transformed)) {
      const next = visit(entryValue, depth + 1, entryKey)
      if (next !== undefined) output[entryKey] = next
    }
    active.delete(transformed)
    return output
  }

  return visit(value, 0)
}

export function createUiContext(
  elements: readonly NuraElement[],
  options: NuraUiContextOptions = {},
): NuraUiContextElement[] {
  const maxElements = options.maxElements ?? 100
  const maxTextLength = options.maxTextLength ?? 240

  return elements.slice(0, maxElements).map((entry) => {
    const element = entry.element as Element & {
      tagName?: string
      textContent?: string | null
      disabled?: boolean
      hidden?: boolean
    }
    const label =
      safeAttribute(element, 'aria-label') ??
      safeAttribute(element, 'title') ??
      safeAttribute(element, 'name') ??
      undefined
    const role = safeAttribute(element, 'role') ?? undefined
    const ariaDisabled = safeAttribute(element, 'aria-disabled')
    const ariaHidden = safeAttribute(element, 'aria-hidden')

    const context: NuraUiContextElement = {
      id: entry.id,
      scope: entry.scope,
      actions: [...entry.verbs],
      tag: element.tagName?.toLowerCase(),
      role,
      label,
      disabled: element.disabled === true || ariaDisabled === 'true',
      hidden: element.hidden === true || ariaHidden === 'true',
    }

    if (options.includeText) {
      const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) context.text = text.slice(0, maxTextLength)
    }
    if (options.includeMetadata && entry.metadata) {
      context.metadata = sanitizeAgentValue(entry.metadata, options)
    }

    return context
  })
}

export function buildAgentTools(
  specs: readonly NActionSpec[],
): NuraAgentTool[] {
  const usedNames = new Map<string, number>()

  return specs.map((spec, specIndex) => {
    const target = spec.target ?? spec.scope
    const fallback = `${spec.type}_${target ?? 'action'}`
    const baseName = normalizeToolName(spec.name || fallback)
    const count = (usedNames.get(baseName) ?? 0) + 1
    usedNames.set(baseName, count)
    const suffix = `_${count}`
    const name =
      count === 1
        ? baseName
        : `${baseName.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`

    return {
      name,
      description:
        spec.meta?.desc ??
        firstCanonicalPhrase(spec) ??
        `${spec.type}${target ? ` ${target}` : ''}`,
      inputSchema: resolveInputSchema(spec),
      action: {
        specName: spec.name,
        specIndex,
        type: spec.type,
        target,
      },
    }
  })
}

export class NuraAgentBridge {
  private readonly registry: NRegistry
  private readonly executeAction: NuraAgentBridgeOptions['execute']
  private readonly exposure?: NuraAgentExposure
  private readonly contextProvider?: NuraAgentBridgeOptions['context']
  private readonly sanitizeOptions?: NuraAgentSanitizeOptions
  private readonly maxContextBytes: number
  private readonly maxArgumentBytes: number

  constructor(options: NuraAgentBridgeOptions) {
    this.registry = options.registry
    this.executeAction = options.execute
    this.exposure = options.expose
    this.contextProvider = options.context
    this.sanitizeOptions = options.sanitize
    this.maxContextBytes = Math.max(2, Math.floor(options.maxContextBytes ?? 64_000))
    this.maxArgumentBytes = Math.max(2, Math.floor(options.maxArgumentBytes ?? 64_000))
  }

  private listSpecs(): NActionSpec[] {
    const specs = this.registry.actions.listSpecs()
    if (this.exposure === 'all') return specs
    if (Array.isArray(this.exposure)) {
      const allowed = new Set(this.exposure)
      return specs.filter((spec) => allowed.has(spec.name))
    }
    if (typeof this.exposure === 'function') return specs.filter(this.exposure)
    return specs.filter((spec) => spec.meta?.agent === true)
  }

  listTools(): NuraAgentTool[] {
    return buildAgentTools(this.listSpecs())
  }

  formatTools<TTool, TCall>(
    adapter: NuraAgentAdapter<TTool, TCall>,
  ): TTool[] {
    return adapter.formatTools(this.listTools())
  }

  async serializeContext(extra?: unknown): Promise<string> {
    const state = this.contextProvider
      ? await this.contextProvider()
      : undefined
    const value: Record<string, unknown> = {
      version: 1,
      app: this.registry.config.app.id,
      locale:
        this.registry.config.app.locale ?? this.registry.i18n.getLocale(),
      tools: this.listTools().map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
    }

    const sanitizedState = sanitizeAgentValue(state, this.sanitizeOptions)
    if (sanitizedState !== undefined) value.state = sanitizedState
    const sanitizedExtra = sanitizeAgentValue(extra, this.sanitizeOptions)
    if (sanitizedExtra !== undefined) value.extra = sanitizedExtra

    return fitContextJson(value, this.maxContextBytes)
  }

  async invoke<TTool, TCall>(
    call: TCall,
    adapter: NuraAgentAdapter<TTool, TCall>,
  ): Promise<NuraAgentInvocation> {
    const parsed = adapter.parseToolCall(call)
    if (!parsed.name) {
      throw new NuraAgentError(
        'INVALID_TOOL_CALL',
        'The agent tool call does not include a name',
      )
    }

    const specs = this.listSpecs()
    const tools = buildAgentTools(specs)
    const tool = tools.find((candidate) => candidate.name === parsed.name)
    if (!tool) {
      throw new NuraAgentError(
        'UNKNOWN_TOOL',
        `Unknown Nura agent tool: ${parsed.name}`,
      )
    }

    const spec = specs[tool.action.specIndex] as NActionSpec
    const payload = parseToolArguments(parsed.arguments, this.maxArgumentBytes)
    if (spec.validate) {
      let valid = false
      try {
        valid = spec.validate(payload)
      } catch {
        valid = false
      }
      if (!valid) {
        throw new NuraAgentError(
          'INVALID_ARGUMENTS',
          `Invalid arguments for Nura tool: ${parsed.name}`,
        )
      }
    }

    const action: ModernNAction = {
      type: tool.action.type,
      target: tool.action.target,
      payload,
      meta: {
        ...spec.meta,
        agentTool: tool.name,
        agentProvider: adapter.id,
      },
    }

    emitTelemetry(this.registry, 'agent.tool.started', {
      provider: adapter.id,
      tool: tool.name,
      callId: parsed.id,
    })

    try {
      const rawResult = await this.executeAction(action)
      const result: NResult =
        rawResult.data === undefined
          ? rawResult
          : {
              ...rawResult,
              data: sanitizeAgentValue(
                rawResult.data,
                this.sanitizeOptions,
              ),
            }

      emitTelemetry(this.registry, 'agent.tool.completed', {
        provider: adapter.id,
        tool: tool.name,
        callId: parsed.id,
        ok: result.ok,
        code: result.code,
      })

      return {
        callId: parsed.id,
        tool,
        action,
        result,
      }
    } catch (error) {
      emitTelemetry(this.registry, 'agent.tool.failed', {
        provider: adapter.id,
        tool: tool.name,
        callId: parsed.id,
        errorType: error instanceof Error ? error.name : typeof error,
        ...(error instanceof NuraAgentError ? { errorCode: error.code } : {}),
      })
      throw error
    }
  }
}

export const createAgentBridge = (
  options: NuraAgentBridgeOptions,
): NuraAgentBridge => new NuraAgentBridge(options)

export const genericAgentAdapter: NuraAgentAdapter<
  NuraAgentTool,
  Record<string, unknown>
> = {
  id: 'generic',
  formatTools: (tools) => tools,
  parseToolCall: (call) => ({
    id: asString(call.id) ?? asString(call.callId),
    name: asString(call.name) ?? asString(call.tool) ?? '',
    arguments: call.arguments ?? call.args ?? call.input,
  }),
}

export const openAIResponsesAgentAdapter: NuraAgentAdapter<
  Record<string, unknown>,
  Record<string, unknown>
> = {
  id: 'openai-responses',
  formatTools: (tools) =>
    tools.map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      ...(isStrictObjectSchema(tool.inputSchema) ? { strict: true } : {}),
    })),
  parseToolCall: (call) => ({
    id: asString(call.call_id) ?? asString(call.id),
    name: asString(call.name) ?? '',
    arguments: call.arguments,
  }),
}

export const openAIChatCompletionsAgentAdapter: NuraAgentAdapter<
  Record<string, unknown>,
  Record<string, unknown>
> = {
  id: 'openai-chat-completions',
  formatTools: (tools) =>
    tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
        ...(isStrictObjectSchema(tool.inputSchema) ? { strict: true } : {}),
      },
    })),
  parseToolCall: (call) => {
    const fn = asRecord(call.function)
    return {
      id: asString(call.id),
      name: asString(fn?.name) ?? '',
      arguments: fn?.arguments,
    }
  },
}

export const anthropicAgentAdapter: NuraAgentAdapter<
  Record<string, unknown>,
  Record<string, unknown>
> = {
  id: 'anthropic',
  formatTools: (tools) =>
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    })),
  parseToolCall: (call) => ({
    id: asString(call.id),
    name: asString(call.name) ?? '',
    arguments: call.input,
  }),
}

export const mcpAgentAdapter: NuraAgentAdapter<
  Record<string, unknown>,
  Record<string, unknown>
> = {
  id: 'mcp',
  formatTools: (tools) =>
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  parseToolCall: (call) => {
    const params = asRecord(call.params)
    return {
      id: asString(call.id),
      name: asString(params?.name) ?? asString(call.name) ?? '',
      arguments: params?.arguments ?? call.arguments,
    }
  },
}

function safeAttribute(element: Element, name: string): string | null {
  try {
    return element.getAttribute(name)
  } catch {
    return null
  }
}

function normalizeToolName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .slice(0, 64)
  if (!normalized) return 'nura_action'
  return /^[a-zA-Z_]/.test(normalized)
    ? normalized
    : `nura_${normalized}`.slice(0, 64)
}

function firstCanonicalPhrase(spec: NActionSpec): string | undefined {
  for (const phrases of Object.values(spec.phrases)) {
    const first = phrases.canonical.find((value) => value.trim())
    if (first) return first
  }
  return undefined
}

function resolveInputSchema(spec: NActionSpec): NJsonSchema {
  const declared = spec.inputSchema ?? spec.meta?.inputSchema
  if (isRecord(declared)) return declared

  const properties: Record<string, unknown> = {}
  for (const entity of spec.entities ?? []) {
    properties[entity.name] = entitySchema(entity)
  }
  const required = (spec.meta?.requiredEntities ?? []).filter(
    (name): name is string =>
      typeof name === 'string' && Object.prototype.hasOwnProperty.call(properties, name),
  )

  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  }
}

function entitySchema(entity: NEntityDef): Record<string, unknown> {
  switch (entity.type) {
    case 'number':
    case 'range_number':
      return { type: 'number' }
    case 'boolean':
      return { type: 'boolean' }
    case 'enum':
      return {
        type: 'string',
        ...(entity.options?.length ? { enum: entity.options } : {}),
      }
    case 'date':
      return {
        type: 'string',
        format: 'date',
        ...(entity.pattern ? { pattern: entity.pattern.source } : {}),
      }
    default:
      return { type: 'string' }
  }
}

function isStrictObjectSchema(schema: NJsonSchema): boolean {
  if (schema.type !== 'object' || schema.additionalProperties !== false) {
    return false
  }
  const properties = isRecord(schema.properties) ? Object.keys(schema.properties) : []
  const required = Array.isArray(schema.required)
    ? new Set(schema.required.filter((value): value is string => typeof value === 'string'))
    : new Set<string>()
  return properties.every((name) => required.has(name))
}

function parseToolArguments(
  input: unknown,
  maxBytes: number,
): Record<string, unknown> | undefined {
  if (input === undefined || input === null || input === '') return undefined
  assertArgumentSize(input, maxBytes)

  let parsed = input
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch {
      throw new NuraAgentError(
        'INVALID_ARGUMENTS',
        'Agent tool arguments are not valid JSON',
      )
    }
  }

  if (!isRecord(parsed)) {
    throw new NuraAgentError(
      'INVALID_ARGUMENTS',
      'Agent tool arguments must be a JSON object',
    )
  }

  return cleanArgumentRecord(parsed, 0)
}

function assertArgumentSize(input: unknown, maxBytes: number): void {
  let serialized: string | undefined
  try {
    serialized = typeof input === 'string' ? input : JSON.stringify(input)
  } catch {
    serialized = undefined
  }
  if (typeof serialized !== 'string') {
    throw new NuraAgentError(
      'INVALID_ARGUMENTS',
      'Agent tool arguments must be JSON serializable',
    )
  }
  if (byteLength(serialized) > maxBytes) {
    throw new NuraAgentError(
      'ARGUMENTS_TOO_LARGE',
      `Agent tool arguments exceed ${maxBytes} bytes`,
    )
  }
}

function cleanArgumentRecord(
  value: Record<string, unknown>,
  depth: number,
): Record<string, unknown> {
  const output = Object.create(null) as Record<string, unknown>
  for (const [key, item] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key)) continue
    output[key] = cleanArgumentValue(item, depth + 1)
  }
  return output
}

function cleanArgumentValue(value: unknown, depth: number): unknown {
  if (depth > 20) {
    throw new NuraAgentError(
      'INVALID_ARGUMENTS',
      'Agent tool arguments exceed the maximum nesting depth',
    )
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((entry) => cleanArgumentValue(entry, depth + 1))
  }
  if (isRecord(value)) return cleanArgumentRecord(value, depth)
  throw new NuraAgentError(
    'INVALID_ARGUMENTS',
    'Agent tool arguments must contain only JSON values',
  )
}

function fitContextJson(
  value: Record<string, unknown>,
  maxBytes: number,
): string {
  let json = JSON.stringify(value)
  if (byteLength(json) <= maxBytes) return json

  const compact: Record<string, unknown> = {
    ...value,
    truncated: true,
  }
  delete compact.state
  json = JSON.stringify(compact)
  if (byteLength(json) <= maxBytes) return json

  delete compact.extra
  const tools = [...(compact.tools as unknown[])]
  compact.tools = tools
  while (tools.length && byteLength(JSON.stringify(compact)) > maxBytes) {
    tools.pop()
  }
  json = JSON.stringify(compact)
  if (byteLength(json) <= maxBytes) return json

  const minimal = JSON.stringify({ version: 1, truncated: true })
  return byteLength(minimal) <= maxBytes ? minimal : '{}'
}

function emitTelemetry(
  registry: NRegistry,
  event: string,
  payload: Record<string, unknown>,
): void {
  try {
    registry.telemetry.emit(event, payload)
  } catch {
    // Observability must not become an execution dependency.
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
