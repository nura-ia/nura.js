import assert from 'node:assert/strict'
import test from 'node:test'

import {
  Nura,
  createAgentBridge,
  createRegistry,
  defineActionSpec,
  openAIResponsesAgentAdapter,
} from '../dist/index.js'

test('agent actions execute through validation and authorization', async () => {
  const registry = createRegistry({
    config: { app: { id: 'hardening-test' }, defaultPolicy: 'deny' },
    permissions: { scopes: { orders: { open: { policy: 'allow' } } } },
    specs: [
      defineActionSpec({
        name: 'open_orders',
        type: 'open',
        target: 'orders',
        phrases: { en: { canonical: ['open orders'] } },
        validate: (payload) => payload?.filter === 'today',
        meta: { agent: true, desc: 'Open orders' },
      }),
    ],
    routes: {
      'open::orders': (payload) => ({ ok: true, data: { filter: payload?.filter } }),
    },
  })
  const nura = new Nura({ registry })
  const bridge = createAgentBridge({
    registry,
    execute: (action) => nura.act(action),
    context: () => ({ route: '/orders', apiToken: 'not-for-the-model' }),
  })

  const tools = bridge.formatTools(openAIResponsesAgentAdapter)
  assert.equal(tools[0].name, 'open_orders')
  const result = await bridge.invoke({
    type: 'function_call',
    call_id: 'call-1',
    name: 'open_orders',
    arguments: '{"filter":"today"}',
  }, openAIResponsesAgentAdapter)
  assert.equal(result.result.ok, true)
  assert.equal(JSON.parse(await bridge.serializeContext()).state.apiToken, '[REDACTED]')
})
