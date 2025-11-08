import test from 'node:test'
import assert from 'node:assert/strict'

import { createRegistry, Nura } from '../dist/index.js'

test('Nura.act requests confirmation when metadata requires it', async () => {
  let confirmCalls = 0
  let executed = 0

  const registry = createRegistry({
    config: {
      app: { id: 'audit-app' },
      confirm: ({ action }) => {
        confirmCalls++
        return Boolean(action.meta?.allow)
      },
    },
    routes: {
      'delete::account': () => {
        executed++
        return { ok: true }
      },
    },
  })

  const nura = new Nura({ registry })

  const denied = await nura.act({
    type: 'delete',
    target: 'account',
    meta: { requireConfirm: true },
  })

  assert.equal(denied.ok, false)
  assert.equal(denied.message, 'cancelled:confirm')
  assert.equal(executed, 0)

  const allowed = await nura.act({
    type: 'delete',
    target: 'account',
    meta: { requireConfirm: true, allow: true },
  })

  assert.equal(allowed.ok, true)
  assert.equal(executed, 1)
  assert.equal(confirmCalls, 2)
})
