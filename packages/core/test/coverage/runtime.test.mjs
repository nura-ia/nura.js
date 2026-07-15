import assert from 'node:assert/strict'
import test from 'node:test'

import { createRegistry } from '../../.coverage-dist/create-registry.js'
import {
  Nura,
  executeNuraAction,
  getActionType,
  requiresConfirmation,
  resolveActionScope,
} from '../../.coverage-dist/runtime.js'
import {
  decidePolicy,
  evaluatePermission,
  hasRole,
  pickRule,
} from '../../.coverage-dist/permissions.js'

const modern = (overrides = {}) => ({ type: 'open', target: 'orders', ...overrides })
const legacy = (overrides = {}) => ({
  verb: 'open',
  scope: 'orders',
  handler: () => undefined,
  ...overrides,
})

test('permission helpers cover fallbacks, roles, rules, policies, and conditions', async () => {
  const permissions = {
    scopes: {
      orders: {
        open: { roles: ['admin'], policy: 'allow' },
        close: { confirm: true },
        delete: { policy: 'deny' },
        view: { condition: async () => true },
        update: { condition: () => false },
        create: { condition: () => { throw new Error('condition error') } },
      },
    },
  }

  assert.equal(decidePolicy(undefined), 'allow')
  assert.equal(decidePolicy(undefined, 'deny'), 'deny')
  assert.equal(decidePolicy({ confirm: true, policy: 'deny' }), 'confirm')
  assert.equal(decidePolicy({ policy: 'deny' }), 'deny')
  assert.equal(decidePolicy({}), 'allow')

  assert.equal(hasRole(undefined, undefined), true)
  assert.equal(hasRole({}, undefined), true)
  assert.equal(hasRole({ roles: ['admin'] }, undefined), false)
  assert.equal(hasRole({ roles: ['admin'] }, { roles: [] }), false)
  assert.equal(hasRole({ roles: ['admin'] }, { roles: ['viewer'] }), false)
  assert.equal(hasRole({ roles: ['admin'] }, { roles: ['admin'] }), true)

  assert.equal(pickRule(permissions, undefined, 'open'), undefined)
  assert.equal(pickRule(permissions, 'orders', undefined), undefined)
  assert.equal(pickRule(permissions, 'missing', 'open'), undefined)
  assert.deepEqual(pickRule(permissions, 'orders', 'open'), permissions.scopes.orders.open)

  assert.equal((await evaluatePermission({ permissions, scope: 'orders', actionType: 'open', actor: { roles: ['admin'] } })).allowed, true)
  assert.equal((await evaluatePermission({ permissions, scope: 'orders', actionType: 'open', actor: { roles: ['viewer'] } })).reason, 'forbidden:role')
  assert.equal((await evaluatePermission({ permissions, scope: 'orders', actionType: 'delete' })).reason, 'forbidden:policy')
  assert.equal((await evaluatePermission({ permissions, scope: 'orders', actionType: 'view' })).allowed, true)
  assert.equal((await evaluatePermission({ permissions, scope: 'orders', actionType: 'update' })).reason, 'forbidden:condition')
  assert.equal((await evaluatePermission({ permissions, scope: 'orders', actionType: 'create' })).reason, 'forbidden:condition')
  assert.equal((await evaluatePermission({ permissions: { scopes: {} }, scope: 'orders', actionType: 'open', defaultPolicy: 'deny' })).reason, 'forbidden:policy')
  assert.equal((await evaluatePermission({ permissions: { scopes: {} }, scope: 'orders', actionType: 'open' })).allowed, true)
})

test('scope, action type, and confirmation helpers support modern and legacy actions', () => {
  assert.equal(resolveActionScope(modern(), { app: { id: 'a' } }), 'orders')
  assert.equal(resolveActionScope(legacy(), { app: { id: 'a' } }), 'orders')
  assert.equal(resolveActionScope(modern(), { app: { id: 'a' }, resolveScope: () => 'override' }), 'override')
  assert.equal(resolveActionScope(modern(), { app: { id: 'a' }, resolveScope: () => undefined }), 'orders')
  assert.equal(getActionType(modern()), 'open')
  assert.equal(getActionType(legacy()), 'open')
  assert.equal(requiresConfirmation(modern()), false)
  assert.equal(requiresConfirmation(modern({ meta: { requireConfirm: true } })), true)
  assert.equal(requiresConfirmation(legacy()), false)
  assert.equal(requiresConfirmation(legacy({ metadata: { requireConfirm: true } })), true)
})

test('Nura.start is idempotent and safe in server and browser runtimes', () => {
  const originalDocument = globalThis.document
  const originalCustomEvent = globalThis.CustomEvent
  const events = []
  const serverRegistry = createRegistry({ config: { app: { id: 'server' } } })
  serverRegistry.telemetry.on('*', (event) => events.push(event))
  Reflect.deleteProperty(globalThis, 'document')
  Reflect.deleteProperty(globalThis, 'CustomEvent')
  try {
    const runtime = new Nura({ registry: serverRegistry })
    runtime.start()
    runtime.start()
    assert.deepEqual(events, [{ event: 'runtime.started', appId: 'server', browser: false }])
  } finally {
    if (originalDocument !== undefined) globalThis.document = originalDocument
    if (originalCustomEvent !== undefined) globalThis.CustomEvent = originalCustomEvent
  }

  const dispatched = []
  globalThis.document = { dispatchEvent: (event) => dispatched.push(event.type) }
  globalThis.CustomEvent = class { constructor(type) { this.type = type } }
  try {
    const registry = createRegistry({ config: { app: { id: 'browser' } } })
    new Nura({ registry }).start()
    assert.deepEqual(dispatched, ['nura:started'])
  } finally {
    if (originalDocument === undefined) Reflect.deleteProperty(globalThis, 'document')
    else globalThis.document = originalDocument
    if (originalCustomEvent === undefined) Reflect.deleteProperty(globalThis, 'CustomEvent')
    else globalThis.CustomEvent = originalCustomEvent
  }
})

test('modern target is the permission scope and default deny fails closed', async () => {
  let dispatches = 0
  const audits = []
  const registry = createRegistry({
    config: {
      app: { id: 'secure' },
      defaultPolicy: 'deny',
      actor: () => ({ id: 'viewer', roles: ['viewer'], tenant: 't1' }),
    },
    audit: { log: (entry) => audits.push(entry) },
    permissions: {
      scopes: { orders: { open: { roles: ['admin'], policy: 'allow' } } },
    },
    routes: {
      'open::orders': () => { dispatches += 1; return { ok: true } },
    },
  })
  const result = await new Nura({ registry }).act(modern())
  assert.equal(result.message, 'forbidden:role')
  assert.equal(dispatches, 0)
  assert.equal(audits[0].scope, 'orders')
  assert.equal(audits[0].actor.tenant, 't1')

  const unknown = await new Nura({ registry }).act({ type: 'view', target: 'dashboard' })
  assert.equal(unknown.message, 'forbidden:policy')
})

test('custom scope resolution, roles, and dynamic conditions are enforced', async () => {
  let conditionContext
  const registry = createRegistry({
    config: {
      app: { id: 'scope' },
      resolveScope: () => 'resolved',
      actor: () => ({ roles: ['operator'] }),
    },
    permissions: {
      scopes: {
        resolved: {
          open: {
            roles: ['operator'],
            condition: (context) => { conditionContext = context; return true },
          },
        },
      },
    },
    routes: { 'open::orders': () => ({ ok: true }) },
  })
  const result = await new Nura({ registry }).act(modern())
  assert.equal(result.ok, true)
  assert.equal(conditionContext.scope, 'resolved')
  assert.equal(conditionContext.actionType, 'open')
})

test('payload validation denies false and thrown validators before dispatch', async () => {
  let dispatches = 0
  const registry = createRegistry({
    config: { app: { id: 'validation' } },
    specs: [
      { name: 'wrong-type', type: 'close', target: 'orders', phrases: { en: { canonical: ['close'] } }, validate: () => true },
      { name: 'wrong-target', type: 'open', target: 'other', phrases: { en: { canonical: ['open other'] } }, validate: () => true },
      { name: 'validate', type: 'open', target: 'orders', phrases: { en: { canonical: ['open'] } }, validate: () => false },
    ],
    routes: { 'open::orders': () => { dispatches += 1; return { ok: true } } },
  })
  assert.equal((await new Nura({ registry }).act(modern({ payload: { x: 1 } }))).message, 'invalid:payload')
  assert.equal(dispatches, 0)

  const throwing = createRegistry({
    config: { app: { id: 'throwing' } },
    specs: [
      { name: 'validate', type: 'open', target: 'orders', phrases: { en: { canonical: ['open'] } }, validate: () => { throw new Error('bad') } },
    ],
    routes: { 'open::orders': () => ({ ok: true }) },
  })
  assert.equal((await new Nura({ registry: throwing }).act(modern())).message, 'invalid:payload')

  const legacyResult = await executeNuraAction(registry, legacy(), {
    spec: { name: 'legacy-validation', type: 'open', scope: 'orders', phrases: { en: { canonical: ['open'] } }, validate: (payload) => payload === undefined },
    dispatch: async () => ({ ok: true }),
  })
  assert.equal(legacyResult.ok, true)

  const scoped = createRegistry({
    config: { app: { id: 'scoped' } },
    specs: [{ name: 'scope-fallback', type: 'open', scope: 'orders', phrases: { en: { canonical: ['open'] } }, validate: () => true }],
    routes: { 'open::orders': () => ({ ok: true }) },
  })
  assert.equal((await new Nura({ registry: scoped }).act(modern())).ok, true)
})

test('confirmations are explicit and fail closed without a host callback', async () => {
  const originalWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    const registry = createRegistry({
      config: { app: { id: 'confirm' } },
      permissions: { scopes: { orders: { delete: { policy: 'confirm' } } } },
      routes: { 'delete::orders': () => ({ ok: true }) },
    })
    assert.equal((await new Nura({ registry }).act({ type: 'delete', target: 'orders' })).message, 'cancelled:confirm')
  } finally {
    if (originalWindow !== undefined) globalThis.window = originalWindow
  }

  let prompts = 0
  globalThis.window = { confirm: () => { prompts += 1; return true } }
  try {
    const registry = createRegistry({
      config: { app: { id: 'browser-confirm' } },
      permissions: { scopes: { orders: { delete: { policy: 'confirm' } } } },
      routes: { 'delete::orders': () => ({ ok: true }) },
    })
    assert.equal((await new Nura({ registry }).act({ type: 'delete', target: 'orders' })).ok, true)
    assert.equal(prompts, 1)
  } finally {
    if (originalWindow === undefined) Reflect.deleteProperty(globalThis, 'window')
    else globalThis.window = originalWindow
  }

  const cancelled = createRegistry({
    config: { app: { id: 'cancelled' }, confirm: () => false },
    routes: { 'delete::orders': () => ({ ok: true }) },
  })
  assert.equal((await new Nura({ registry: cancelled }).act({ type: 'delete', target: 'orders', meta: { requireConfirm: true } })).message, 'cancelled:confirm')

  const approved = createRegistry({
    config: { app: { id: 'approved' }, confirm: async () => true },
    routes: { 'delete::orders': () => ({ ok: true }) },
  })
  assert.equal((await new Nura({ registry: approved }).act({ type: 'delete', target: 'orders', meta: { requireConfirm: true } })).ok, true)

  const brokenConfirmation = createRegistry({
    config: { app: { id: 'broken-confirmation' }, confirm: () => { throw new Error('offline') } },
    routes: { 'delete::orders': () => ({ ok: true }) },
  })
  assert.equal((await new Nura({ registry: brokenConfirmation }).act({ type: 'delete', target: 'orders', meta: { requireConfirm: true } })).message, 'cancelled:confirm')
})

test('registered framework actions share the central permission boundary', async () => {
  let executions = 0
  const registry = createRegistry({
    config: {
      app: { id: 'legacy' },
      defaultPolicy: 'deny',
      actor: () => ({ roles: ['viewer'] }),
    },
    permissions: { scopes: { orders: { delete: { roles: ['admin'] } } } },
  })
  registry.registerAction({
    verb: 'delete',
    scope: 'orders',
    handler: () => { executions += 1 },
    metadata: { requireConfirm: true },
  })
  assert.equal((await registry.executeAction('delete', 'orders')).message, 'forbidden:role')
  assert.equal(executions, 0)

  registry.addPermission({ scope: 'orders', verbs: ['delete'], policy: 'allow', condition: () => true })
  registry.config.confirm = () => false
  assert.equal(
    (await registry.executeAction('delete', 'orders', { requireConfirm: false })).message,
    'cancelled:confirm',
  )
  assert.equal(executions, 0)

  registry.config.confirm = () => true
  assert.equal((await registry.executeAction('delete', 'orders', { requestId: 'one' })).ok, true)
  assert.equal(executions, 1)
  assert.equal(await registry.hasPermission('delete', 'orders'), true)

  registry.addPermission({ scope: 'blocked', verbs: ['open'], policy: 'allow', condition: () => false })
  assert.equal(await registry.hasPermission('open', 'blocked'), false)
  registry.removePermission('blocked')
  assert.equal(await registry.hasPermission('open', 'blocked'), false)

  const legacyDefault = createRegistry({ config: { app: { id: 'legacy-default' } } })
  assert.equal(await legacyDefault.hasPermission('open', 'unconfigured'), false)
})

test('runtime records successful, failed, and exceptional dispatch results', async () => {
  const auditEntries = []
  const events = []
  const registry = createRegistry({
    config: { app: { id: 'results' } },
    audit: { log: (entry) => auditEntries.push(entry) },
    routes: {
      'open::orders': () => ({ ok: true, data: { opened: true } }),
      'close::orders': () => ({ ok: false, message: 'closed-failed', code: 'CLOSE_FAILED' }),
      'delete::orders': () => { throw new Error('boom') },
      'update::orders': () => { throw 'string failure' },
    },
  })
  registry.telemetry.on('*', (event) => events.push(event))
  assert.equal((await new Nura({ registry }).act(modern())).ok, true)
  assert.equal((await new Nura({ registry }).act({ type: 'close', target: 'orders' })).message, 'closed-failed')
  assert.equal((await new Nura({ registry }).act({ type: 'delete', target: 'orders' })).code, 'ACTION_EXECUTION_FAILED')
  assert.equal((await new Nura({ registry }).act({ type: 'update', target: 'orders' })).message, 'Unknown action error')
  assert.ok(auditEntries.length >= 4)
  assert.ok(events.some((event) => event.event === 'action.completed'))
  assert.ok(events.some((event) => event.event === 'action.failed'))

  const actorRegistry = createRegistry({
    config: { app: { id: 'actor-error' }, actor: () => ({ id: 'actor-1', tenant: 'tenant-1' }) },
    routes: { 'delete::orders': () => { throw new Error('actor boom') } },
  })
  const actorEvents = []
  actorRegistry.telemetry.on('*', (event) => actorEvents.push(event))
  assert.equal((await new Nura({ registry: actorRegistry }).act({ type: 'delete', target: 'orders' })).ok, false)
  assert.ok(actorEvents.some((event) => event.event === 'action.failed' && event.actorId === 'actor-1' && event.tenant === 'tenant-1'))

  const observerFailure = createRegistry({
    config: { app: { id: 'observer-failure' } },
    audit: { log: () => { throw new Error('audit unavailable') } },
    routes: { 'open::orders': () => ({ ok: true }) },
  })
  observerFailure.telemetry.emit = () => { throw new Error('telemetry unavailable') }
  assert.equal((await new Nura({ registry: observerFailure }).act(modern())).ok, true)
  assert.equal((await new Nura({ registry: observerFailure }).act({ type: 'delete', target: 'orders' })).ok, false)
})

test('registry lifecycle listeners unsubscribe and missing actions return structured errors', async () => {
  const registry = createRegistry({ app: { id: 'direct-config' } })
  const events = []
  registry.on('action:registered', () => { throw new Error('listener failure') })
  const off = registry.on('action:registered', (event) => events.push(event))
  registry.registerAction({ verb: 'open', scope: 'orders', handler: () => undefined })
  off()
  registry.registerAction({ verb: 'close', scope: 'orders', handler: () => undefined })
  registry.unregisterAction('close', 'orders')
  assert.equal(events.length, 1)
  assert.equal((await registry.executeAction('close', 'orders')).message, 'No action registered for orders:close')
})
