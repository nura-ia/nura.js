import assert from 'node:assert/strict'
import test from 'node:test'

import {
  NuraAgentBridge,
  NuraAgentError,
  anthropicAgentAdapter,
  buildAgentTools,
  createAgentBridge,
  createUiContext,
  genericAgentAdapter,
  mcpAgentAdapter,
  openAIChatCompletionsAgentAdapter,
  openAIResponsesAgentAdapter,
  sanitizeAgentValue,
} from '../../.coverage-dist/agent.js'
import { createRegistry } from '../../.coverage-dist/create-registry.js'

const actionSpec = (overrides = {}) => ({
  name: 'open_orders',
  type: 'open',
  target: 'orders',
  phrases: { en: { canonical: ['open orders'] } },
  meta: { agent: true, desc: 'Open orders' },
  ...overrides,
})

const makeRegistry = (specs = [actionSpec()], config = {}) =>
  createRegistry({
    config: { app: { id: 'agent-test', locale: 'en-US' }, ...config },
    specs,
  })

const fakeElement = (values = {}) => ({
  tagName: values.tagName ?? 'BUTTON',
  textContent: values.textContent ?? '  Open   orders  ',
  disabled: values.disabled ?? false,
  hidden: values.hidden ?? false,
  getAttribute(name) {
    if (values.throwAttribute === name) throw new Error('attribute failure')
    return values.attributes?.[name] ?? null
  },
})

test('NuraAgentError exposes a stable code', () => {
  const error = new NuraAgentError('TEST', 'message')
  assert.equal(error.name, 'NuraAgentError')
  assert.equal(error.code, 'TEST')
  assert.equal(error.message, 'message')
})

test('sanitizeAgentValue handles primitives, limits, secrets, cycles, and classes', () => {
  class CustomValue {}
  const cyclic = { value: 1 }
  cyclic.self = cyclic
  const shared = { value: 'shared' }
  const input = {
    nullValue: null,
    booleanValue: true,
    numberValue: 2,
    nanValue: Number.NaN,
    infinityValue: Number.POSITIVE_INFINITY,
    short: 'ok',
    long: 'abcdef',
    big: 12n,
    missing: undefined,
    fn: () => true,
    symbol: Symbol('x'),
    date: new Date('2026-01-02T03:04:05.000Z'),
    error: new TypeError('bad'),
    custom: new CustomValue(),
    array: [1, 2, 3, undefined],
    password: 'hidden',
    firstSecret: 'hidden',
    secondSecret: 'hidden',
    cyclic,
    sharedA: shared,
    sharedB: shared,
    nested: { value: { deeper: true } },
  }
  Object.defineProperty(input, '__proto__', { value: 'blocked', enumerable: true })
  Object.defineProperty(input, 'constructor', { value: 'blocked', enumerable: true })
  Object.defineProperty(input, 'prototype', { value: 'blocked', enumerable: true })

  const output = sanitizeAgentValue(input, {
    maxDepth: 2,
    maxArrayLength: 3,
    maxStringLength: 3,
    redactKey: /secret/gi,
    transform(value, key) {
      return key === 'numberValue' ? 7 : value
    },
  })

  assert.equal(output.nullValue, null)
  assert.equal(output.booleanValue, true)
  assert.equal(output.numberValue, 7)
  assert.equal(output.nanValue, 'NaN')
  assert.equal(output.infinityValue, 'Infinity')
  assert.equal(output.short, 'ok')
  assert.equal(output.long, 'abc...[TRUNCATED]')
  assert.equal(output.big, '12')
  assert.equal('missing' in output, false)
  assert.equal('fn' in output, false)
  assert.equal('symbol' in output, false)
  assert.equal(output.date, '2026-01-02T03:04:05.000Z')
  assert.deepEqual({ ...output.error }, { name: 'TypeError', message: 'bad' })
  assert.equal(output.custom, '[CustomValue]')
  assert.deepEqual(output.array, [1, 2, 3])
  assert.equal(output.password, 'hid...[TRUNCATED]')
  assert.equal(output.firstSecret, '[REDACTED]')
  assert.equal(output.secondSecret, '[REDACTED]')
  assert.equal(output.cyclic.self, '[MAX_DEPTH]')
  assert.equal(output.sharedA.value, 'sha...[TRUNCATED]')
  assert.equal(output.sharedB.value, 'sha...[TRUNCATED]')
  assert.equal(output.nested.value, '[MAX_DEPTH]')
  assert.equal('__proto__' in output, false)
  assert.equal('constructor' in output, false)
  assert.equal('prototype' in output, false)

  assert.equal(sanitizeAgentValue(undefined), undefined)
  assert.equal(sanitizeAgentValue(() => true), undefined)
  assert.equal(sanitizeAgentValue(Symbol('x')), undefined)
  assert.equal(sanitizeAgentValue(1n), '1')
  assert.deepEqual({ ...sanitizeAgentValue(Object.create(null)) }, {})
  const noConstructor = Object.create({ constructor: null })
  assert.equal(sanitizeAgentValue(noConstructor), '[Object]')
})

test('sanitizeAgentValue marks circular references and uses default redaction', () => {
  const cyclic = {}
  cyclic.self = cyclic
  const output = sanitizeAgentValue({ api_token: 'secret', cyclic })
  assert.equal(output.api_token, '[REDACTED]')
  assert.equal(output.cyclic.self, '[CIRCULAR]')
})

test('createUiContext creates a bounded semantic snapshot without DOM nodes', () => {
  const entries = [
    {
      id: 'orders-button',
      scope: 'orders',
      verbs: ['open', 'click'],
      element: fakeElement({
        disabled: true,
        hidden: true,
        attributes: {
          role: 'button',
          'aria-label': 'Orders',
          'aria-disabled': 'false',
          'aria-hidden': 'false',
        },
      }),
      metadata: { token: 'hidden', safe: 'yes' },
    },
    {
      id: 'second',
      scope: 'secondary',
      verbs: ['view'],
      element: fakeElement({
        tagName: undefined,
        textContent: '',
        attributes: {
          title: 'Secondary',
          'aria-disabled': 'true',
          'aria-hidden': 'true',
        },
        throwAttribute: 'role',
      }),
    },
  ]

  const first = createUiContext(entries, {
    maxElements: 1,
    includeText: true,
    includeMetadata: true,
    maxTextLength: 5,
  })[0]
  assert.deepEqual(first.actions, ['open', 'click'])
  assert.equal(first.tag, 'button')
  assert.equal(first.role, 'button')
  assert.equal(first.label, 'Orders')
  assert.equal(first.disabled, true)
  assert.equal(first.hidden, true)
  assert.equal(first.text, 'Open ')
  assert.equal(first.metadata.token, '[REDACTED]')
  assert.equal('element' in first, false)

  const second = createUiContext(entries.slice(1))[0]
  assert.equal(second.role, undefined)
  assert.equal(second.label, 'Secondary')
  assert.equal(second.disabled, true)
  assert.equal(second.hidden, true)
  assert.equal('text' in second, false)
  assert.equal('metadata' in second, false)

  const named = createUiContext([
    {
      id: 'named',
      scope: 'named',
      verbs: ['view'],
      element: fakeElement({ attributes: { name: 'Named element' } }),
    },
  ])[0]
  assert.equal(named.label, 'Named element')

  const empty = createUiContext([
    {
      id: 'empty',
      scope: 'empty',
      verbs: [],
      element: fakeElement({ textContent: '   ', attributes: {} }),
    },
  ], { includeText: true, includeMetadata: true })[0]
  assert.equal(empty.text, undefined)
  assert.equal(empty.metadata, undefined)

  const nullTextElement = {
    tagName: 'DIV',
    textContent: null,
    disabled: false,
    hidden: false,
    getAttribute() { return null },
  }
  const nullText = createUiContext([
    { id: 'null-text', scope: 'null-text', verbs: ['view'], element: nullTextElement },
  ], { includeText: true })[0]
  assert.equal(nullText.text, undefined)
})

test('buildAgentTools normalizes schemas, descriptions, fallbacks, and collisions', () => {
  const tools = buildAgentTools([
    actionSpec({
      name: 'Open orders now!',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        additionalProperties: false,
      },
    }),
    actionSpec({
      name: 'Open orders now!',
      meta: { agent: true },
      entities: [
        { name: 'name', type: 'string' },
        { name: 'count', type: 'number' },
        { name: 'range', type: 'range_number' },
        { name: 'enabled', type: 'boolean' },
        { name: 'status', type: 'enum', options: ['new', 'done'] },
        { name: 'emptyStatus', type: 'enum' },
        { name: 'date', type: 'date', pattern: /^2026-/ },
        { name: 'otherDate', type: 'date' },
      ],
      phrases: { en: { canonical: ['second description'] } },
    }),
    actionSpec({
      name: '   ',
      type: 'custom',
      target: undefined,
      phrases: { en: { canonical: [] } },
      meta: {
        agent: true,
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
    }),
    actionSpec({
      name: '',
      type: 'view',
      target: 'dashboard',
      phrases: { en: { canonical: [] } },
      meta: { agent: true },
    }),
    actionSpec({
      name: '123 run',
      type: 'custom',
      target: undefined,
      phrases: { en: { canonical: [] } },
      meta: { agent: true },
    }),
    actionSpec({ name: 'required', target: undefined, scope: 'legacy-scope', entities: [{ name: 'id', type: 'string' }], meta: { agent: true, requiredEntities: ['id', 'missing'] } }),
    actionSpec({ name: 'x'.repeat(80) }),
    actionSpec({ name: 'x'.repeat(80) }),
    actionSpec({ name: '!test!' }),
  ])

  assert.equal(tools[0].name, 'Open_orders_now')
  assert.equal(tools[1].name, 'Open_orders_now_2')
  assert.equal(tools[1].description, 'second description')
  assert.equal(tools[1].inputSchema.properties.name.type, 'string')
  assert.equal(tools[1].inputSchema.properties.count.type, 'number')
  assert.equal(tools[1].inputSchema.properties.range.type, 'number')
  assert.equal(tools[1].inputSchema.properties.enabled.type, 'boolean')
  assert.deepEqual(tools[1].inputSchema.properties.status.enum, ['new', 'done'])
  assert.equal(tools[1].inputSchema.properties.emptyStatus.enum, undefined)
  assert.equal(tools[1].inputSchema.properties.date.pattern, '^2026-')
  assert.equal(tools[1].inputSchema.properties.otherDate.pattern, undefined)
  assert.equal(tools[2].name, 'nura_action')
  assert.equal(tools[2].description, 'custom')
  assert.equal(tools[3].name, 'view_dashboard')
  assert.equal(tools[4].name, 'nura_123_run')
  assert.deepEqual(tools[5].inputSchema.required, ['id'])
  assert.equal(tools[5].action.target, 'legacy-scope')
  assert.equal(tools[0].action.specIndex, 0)
  assert.equal(tools[6].name.length, 64)
  assert.equal(tools[7].name.length, 64)
  assert.notEqual(tools[6].name, tools[7].name)
  assert.ok(tools[7].name.endsWith('_2'))
  assert.equal(tools[8].name, 'test')
})

test('NuraAgentBridge exposure is deny-by-default and supports explicit policies', () => {
  const specs = [
    actionSpec({ name: 'safe', meta: { agent: true } }),
    actionSpec({ name: 'hidden', meta: { agent: false } }),
    actionSpec({ name: 'unmarked', meta: undefined }),
  ]
  const registry = makeRegistry(specs)
  const defaults = new NuraAgentBridge({ registry, execute: () => ({ ok: true }) })
  assert.deepEqual(defaults.listTools().map((tool) => tool.name), ['safe'])

  const all = createAgentBridge({ registry, expose: 'all', execute: () => ({ ok: true }) })
  assert.equal(all.listTools().length, 3)

  const selected = new NuraAgentBridge({
    registry,
    expose: ['hidden'],
    execute: () => ({ ok: true }),
  })
  assert.deepEqual(selected.listTools().map((tool) => tool.name), ['hidden'])

  const predicate = new NuraAgentBridge({
    registry,
    expose: (candidate) => candidate.name.startsWith('u'),
    execute: () => ({ ok: true }),
  })
  assert.deepEqual(predicate.listTools().map((tool) => tool.name), ['unmarked'])
})

test('provider adapters format and parse canonical Nura tools', () => {
  const bridge = new NuraAgentBridge({
    registry: makeRegistry(),
    expose: 'all',
    execute: () => ({ ok: true }),
  })

  assert.equal(bridge.formatTools(genericAgentAdapter)[0].name, 'open_orders')
  const responses = bridge.formatTools(openAIResponsesAgentAdapter)
  assert.equal(responses[0].type, 'function')
  assert.equal(responses[0].strict, true)
  assert.equal(responses[0].parameters.additionalProperties, false)

  const nonStrict = new NuraAgentBridge({
    registry: makeRegistry([actionSpec({ inputSchema: { type: 'object', properties: { optional: { type: 'string' } }, additionalProperties: false } })]),
    expose: 'all',
    execute: () => ({ ok: true }),
  })
  assert.equal(nonStrict.formatTools(openAIResponsesAgentAdapter)[0].strict, undefined)
  assert.equal(nonStrict.formatTools(openAIChatCompletionsAgentAdapter)[0].function.strict, undefined)

  const scalarSchema = new NuraAgentBridge({
    registry: makeRegistry([actionSpec({ inputSchema: { type: 'string' } })]),
    expose: 'all',
    execute: () => ({ ok: true }),
  })
  assert.equal(scalarSchema.formatTools(openAIResponsesAgentAdapter)[0].strict, undefined)

  const explicitStrict = new NuraAgentBridge({
    registry: makeRegistry([actionSpec({
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id', 4],
        additionalProperties: false,
      },
    })]),
    expose: 'all',
    execute: () => ({ ok: true }),
  })
  assert.equal(explicitStrict.formatTools(openAIResponsesAgentAdapter)[0].strict, true)

  const propertylessStrict = new NuraAgentBridge({
    registry: makeRegistry([actionSpec({ inputSchema: { type: 'object', additionalProperties: false } })]),
    expose: 'all',
    execute: () => ({ ok: true }),
  })
  assert.equal(propertylessStrict.formatTools(openAIResponsesAgentAdapter)[0].strict, true)

  const chat = bridge.formatTools(openAIChatCompletionsAgentAdapter)
  assert.equal(chat[0].function.name, 'open_orders')
  assert.equal(chat[0].function.strict, true)
  assert.equal(bridge.formatTools(anthropicAgentAdapter)[0].input_schema.type, 'object')
  assert.equal(bridge.formatTools(mcpAgentAdapter)[0].inputSchema.type, 'object')

  assert.deepEqual(genericAgentAdapter.parseToolCall({ id: 'g1', name: 'open_orders', args: { x: 1 } }), {
    id: 'g1', name: 'open_orders', arguments: { x: 1 },
  })
  assert.deepEqual(genericAgentAdapter.parseToolCall({ callId: 'g2', tool: 'open_orders', input: { x: 2 } }), {
    id: 'g2', name: 'open_orders', arguments: { x: 2 },
  })
  assert.deepEqual(openAIResponsesAgentAdapter.parseToolCall({ call_id: 'r1', name: 'open_orders', arguments: '{}' }), {
    id: 'r1', name: 'open_orders', arguments: '{}',
  })
  assert.deepEqual(openAIResponsesAgentAdapter.parseToolCall({ id: 'r2' }), {
    id: 'r2', name: '', arguments: undefined,
  })
  assert.deepEqual(openAIChatCompletionsAgentAdapter.parseToolCall({ id: 'c1', function: { name: 'open_orders', arguments: '{}' } }), {
    id: 'c1', name: 'open_orders', arguments: '{}',
  })
  assert.deepEqual(openAIChatCompletionsAgentAdapter.parseToolCall({}), {
    id: undefined, name: '', arguments: undefined,
  })
  assert.deepEqual(anthropicAgentAdapter.parseToolCall({ id: 'a1', name: 'open_orders', input: { x: 1 } }), {
    id: 'a1', name: 'open_orders', arguments: { x: 1 },
  })
  assert.deepEqual(anthropicAgentAdapter.parseToolCall({}), {
    id: undefined, name: '', arguments: undefined,
  })
  assert.deepEqual(mcpAgentAdapter.parseToolCall({ id: 'm1', params: { name: 'open_orders', arguments: { x: 1 } } }), {
    id: 'm1', name: 'open_orders', arguments: { x: 1 },
  })
  assert.deepEqual(mcpAgentAdapter.parseToolCall({ name: 'open_orders', arguments: { x: 2 } }), {
    id: undefined, name: 'open_orders', arguments: { x: 2 },
  })
  assert.deepEqual(mcpAgentAdapter.parseToolCall({}), {
    id: undefined, name: '', arguments: undefined,
  })
})

test('serializeContext redacts secrets and applies each size fallback', async () => {
  const bridge = new NuraAgentBridge({
    registry: makeRegistry(),
    execute: () => ({ ok: true }),
    context: async () => ({ route: '/orders', api_token: 'hidden' }),
  })
  const full = JSON.parse(await bridge.serializeContext({ requestId: 'one' }))
  assert.equal(full.version, 1)
  assert.equal(full.app, 'agent-test')
  assert.equal(full.locale, 'en-US')
  assert.equal(full.state.api_token, '[REDACTED]')
  assert.equal(full.extra.requestId, 'one')

  const stateDropped = new NuraAgentBridge({
    registry: makeRegistry(),
    execute: () => ({ ok: true }),
    context: () => ({ huge: 'x'.repeat(2_000) }),
    maxContextBytes: 500,
  })
  const stateDroppedValue = JSON.parse(await stateDropped.serializeContext({ small: true }))
  assert.equal(stateDroppedValue.truncated, true)
  assert.equal(stateDroppedValue.state, undefined)
  assert.deepEqual(stateDroppedValue.extra, { small: true })

  const extraDropped = new NuraAgentBridge({
    registry: makeRegistry(),
    execute: () => ({ ok: true }),
    context: () => ({ huge: 'x'.repeat(2_000) }),
    maxContextBytes: 220,
  })
  const extraDroppedValue = JSON.parse(await extraDropped.serializeContext({ huge: 'y'.repeat(2_000) }))
  assert.equal(extraDroppedValue.truncated, true)
  assert.equal(extraDroppedValue.state, undefined)
  assert.equal(extraDroppedValue.extra, undefined)

  const toolsDropped = new NuraAgentBridge({
    registry: makeRegistry(Array.from({ length: 12 }, (_, index) => actionSpec({ name: `tool_${index}` }))),
    expose: 'all',
    execute: () => ({ ok: true }),
    maxContextBytes: 180,
  })
  const toolsDroppedValue = JSON.parse(await toolsDropped.serializeContext())
  assert.equal(toolsDroppedValue.truncated, true)
  assert.ok(toolsDroppedValue.tools.length < 12)

  const minimal = new NuraAgentBridge({
    registry: makeRegistry([], { app: { id: 'a'.repeat(100), locale: 'x' } }),
    expose: 'all',
    execute: () => ({ ok: true }),
    maxContextBytes: 10,
  })
  assert.deepEqual(JSON.parse(await minimal.serializeContext()), {})

  const structuredMinimum = new NuraAgentBridge({
    registry: makeRegistry([], { app: { id: 'a'.repeat(100), locale: 'x' } }),
    expose: 'all',
    execute: () => ({ ok: true }),
    maxContextBytes: 40,
  })
  assert.deepEqual(JSON.parse(await structuredMinimum.serializeContext()), {
    version: 1,
    truncated: true,
  })

  const localeFallback = makeRegistry()
  localeFallback.config.app.locale = undefined
  const noOptional = new NuraAgentBridge({ registry: localeFallback, expose: 'all', execute: () => ({ ok: true }) })
  const empty = JSON.parse(await noOptional.serializeContext())
  assert.equal(empty.locale, 'en-US')
  assert.equal(empty.state, undefined)
  assert.equal(empty.extra, undefined)
})

test('invoke validates calls, cleans arguments, executes actions, and sanitizes results', async () => {
  const registry = makeRegistry([
    actionSpec({
      validate: (payload) => payload?.id === 7,
      meta: {
        agent: true,
        desc: 'Open orders',
        requireConfirm: true,
        domain: 'orders',
      },
    }),
  ])
  const events = []
  registry.telemetry.on('*', (event) => events.push(event))
  const calls = []
  const bridge = new NuraAgentBridge({
    registry,
    expose: 'all',
    execute: async (action) => {
      calls.push(action)
      return { ok: true, data: { opened: action.payload.id, secret: 'hidden' } }
    },
  })

  const invocation = await bridge.invoke({
    call_id: 'call-1',
    name: 'open_orders',
    arguments: '{"id":7,"nested":{"__proto__":{"polluted":true}},"list":[{"constructor":"x","safe":1},2]}',
  }, openAIResponsesAgentAdapter)
  assert.equal(invocation.callId, 'call-1')
  assert.equal(invocation.action.type, 'open')
  assert.equal(invocation.action.target, 'orders')
  assert.equal(invocation.action.meta.agentTool, 'open_orders')
  assert.equal(invocation.action.meta.agentProvider, 'openai-responses')
  assert.equal(invocation.action.meta.requireConfirm, true)
  assert.equal(invocation.action.meta.domain, 'orders')
  assert.equal(invocation.result.data.opened, 7)
  assert.equal(invocation.result.data.secret, '[REDACTED]')
  assert.equal('__proto__' in invocation.action.payload.nested, false)
  assert.equal('constructor' in invocation.action.payload.list[0], false)
  assert.equal(invocation.action.payload.list[1], 2)
  assert.equal(calls.length, 1)
  assert.ok(events.some((event) => event.event === 'agent.tool.started'))
  assert.ok(events.some((event) => event.event === 'agent.tool.completed'))

  const noisyRegistry = makeRegistry()
  noisyRegistry.telemetry.emit = () => { throw new Error('telemetry offline') }
  const telemetrySafe = new NuraAgentBridge({
    registry: noisyRegistry,
    expose: 'all',
    execute: () => ({ ok: true }),
  })
  assert.equal((await telemetrySafe.invoke({ name: 'open_orders' }, genericAgentAdapter)).result.ok, true)

  const noPayload = new NuraAgentBridge({
    registry: makeRegistry([actionSpec({ validate: undefined })]),
    expose: 'all',
    execute: () => ({ ok: true }),
  })
  for (const argumentsValue of [undefined, '', null, {}]) {
    const result = await noPayload.invoke({ name: 'open_orders', arguments: argumentsValue }, genericAgentAdapter)
    assert.equal(result.result.ok, true)
  }
})

test('invoke rejects malformed, unknown, invalid, and over-deep tool calls', async () => {
  const bridge = new NuraAgentBridge({
    registry: makeRegistry([actionSpec({ validate: () => false })]),
    expose: 'all',
    execute: () => ({ ok: true }),
  })

  await assert.rejects(() => bridge.invoke({}, genericAgentAdapter), (error) => error.code === 'INVALID_TOOL_CALL')
  await assert.rejects(() => bridge.invoke({ name: 'missing' }, genericAgentAdapter), (error) => error.code === 'UNKNOWN_TOOL')
  await assert.rejects(() => bridge.invoke({ name: 'open_orders', arguments: '{' }, genericAgentAdapter), (error) => error.code === 'INVALID_ARGUMENTS')
  await assert.rejects(() => bridge.invoke({ name: 'open_orders', arguments: [] }, genericAgentAdapter), (error) => error.code === 'INVALID_ARGUMENTS')
  await assert.rejects(() => bridge.invoke({ name: 'open_orders', arguments: 4 }, genericAgentAdapter), (error) => error.code === 'INVALID_ARGUMENTS')
  await assert.rejects(() => bridge.invoke({ name: 'open_orders', arguments: {} }, genericAgentAdapter), (error) => error.code === 'INVALID_ARGUMENTS')

  const throwingValidator = new NuraAgentBridge({
    registry: makeRegistry([actionSpec({ validate: () => { throw new Error('bad') } })]),
    expose: 'all',
    execute: () => ({ ok: true }),
  })
  await assert.rejects(() => throwingValidator.invoke({ name: 'open_orders', arguments: {} }, genericAgentAdapter), (error) => error.code === 'INVALID_ARGUMENTS')

  const tinyArguments = new NuraAgentBridge({
    registry: makeRegistry(),
    expose: 'all',
    execute: () => ({ ok: true }),
    maxArgumentBytes: 8,
  })
  await assert.rejects(
    () => tinyArguments.invoke({ name: 'open_orders', arguments: { long: 'value' } }, genericAgentAdapter),
    (error) => error.code === 'ARGUMENTS_TOO_LARGE',
  )

  const circular = {}
  circular.self = circular
  await assert.rejects(
    () => bridge.invoke({ name: 'open_orders', arguments: circular }, genericAgentAdapter),
    (error) => error.code === 'INVALID_ARGUMENTS',
  )
  await assert.rejects(
    () => bridge.invoke({ name: 'open_orders', arguments: { invalid: () => true } }, genericAgentAdapter),
    (error) => error.code === 'INVALID_ARGUMENTS',
  )
  await assert.rejects(
    () => bridge.invoke({ name: 'open_orders', arguments: () => true }, genericAgentAdapter),
    (error) => error.code === 'INVALID_ARGUMENTS',
  )

  let nested = {}
  for (let index = 0; index < 23; index += 1) nested = { child: nested }
  const deep = new NuraAgentBridge({ registry: makeRegistry(), expose: 'all', execute: () => ({ ok: true }) })
  await assert.rejects(() => deep.invoke({ name: 'open_orders', arguments: nested }, genericAgentAdapter), (error) => error.code === 'INVALID_ARGUMENTS')
})

test('invoke emits failure telemetry and rethrows executor failures', async () => {
  const registry = makeRegistry()
  const events = []
  registry.telemetry.on('*', (event) => events.push(event))
  const bridge = new NuraAgentBridge({
    registry,
    expose: 'all',
    execute: () => { throw 'executor failed' },
  })
  await assert.rejects(() => bridge.invoke({ name: 'open_orders' }, genericAgentAdapter))
  assert.ok(events.some((event) => event.event === 'agent.tool.failed' && event.errorType === 'string' && event.error === undefined))

  const errorBridge = new NuraAgentBridge({
    registry,
    expose: 'all',
    execute: () => { throw new Error('real failure') },
  })
  await assert.rejects(() => errorBridge.invoke({ name: 'open_orders' }, genericAgentAdapter), /real failure/)
  assert.ok(events.some((event) => event.event === 'agent.tool.failed' && event.errorType === 'Error'))

  const codedBridge = new NuraAgentBridge({
    registry,
    expose: 'all',
    execute: () => { throw new NuraAgentError('EXECUTOR_DENIED', 'denied') },
  })
  await assert.rejects(
    () => codedBridge.invoke({ name: 'open_orders' }, genericAgentAdapter),
    (error) => error.code === 'EXECUTOR_DENIED',
  )
  assert.ok(
    events.some(
      (event) =>
        event.event === 'agent.tool.failed' &&
        event.errorType === 'NuraAgentError' &&
        event.errorCode === 'EXECUTOR_DENIED',
    ),
  )
})
