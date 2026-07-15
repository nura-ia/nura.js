import assert from 'node:assert/strict'
import test from 'node:test'

import {
  NuraHttpSecurityError,
  assertSecurityConfigured,
  authenticateRequest,
  authorizeRequest,
  createIdempotencyScope,
  createRateLimitKey,
  mergeTrustedIntentContext,
  normalizeIdempotencyKey,
} from '../../.coverage-dist/security.js'

const toPlain = (value) => JSON.parse(JSON.stringify(value))

test('security configuration is fail-closed with an explicit local escape hatch', () => {
  assert.throws(() => assertSecurityConfigured(undefined), /requires security\.authenticate/)
  const anonymous = { unsafeAllowAnonymous: true }
  assert.equal(assertSecurityConfigured(anonymous), anonymous)
  const authenticate = { authenticate: () => ({ id: 'user' }) }
  assert.equal(assertSecurityConfigured(authenticate), authenticate)
})

test('authentication normalizes trusted principals and rejects invalid identities', async () => {
  const principal = await authenticateRequest(
    {
      authenticate: async () => ({
        id: '  user-1  ',
        tenant: ' tenant-a ',
        roles: ['admin', 'admin', ' support '],
        metadata: { region: 'us' },
      }),
    },
    {},
  )
  assert.deepEqual(toPlain(principal), {
    id: 'user-1',
    tenant: 'tenant-a',
    roles: ['admin', 'support'],
    metadata: { region: 'us' },
  })

  const metadata = Object.create(null)
  metadata.region = 'eu'
  metadata.nested = { constructor: 'blocked', safe: true }
  const safeMetadata = await authenticateRequest(
    { authenticate: () => ({ id: 'user', metadata }) },
    {},
  )
  assert.deepEqual(toPlain(safeMetadata.metadata), { region: 'eu', nested: { safe: true } })

  assert.deepEqual(
    await authenticateRequest({ unsafeAllowAnonymous: true }, {}),
    { id: 'anonymous', roles: [] },
  )
  assert.deepEqual(
    await authenticateRequest({ authenticate: () => ({ id: 'plain-user' }) }, {}),
    { id: 'plain-user', roles: [] },
  )

  for (const security of [
    {},
    { authenticate: () => null },
    { authenticate: () => undefined },
  ]) {
    await assert.rejects(
      () => authenticateRequest(security, {}),
      (error) => error.code === 'authentication_required' && error.status === 401,
    )
  }
  await assert.rejects(
    () => authenticateRequest({ authenticate: () => { throw new Error('bad') } }, {}),
    (error) => error.code === 'authentication_failed',
  )
  let deepMetadata = {}
  for (let index = 0; index < 22; index += 1) deepMetadata = { child: deepMetadata }
  await assert.rejects(
    () => authenticateRequest(
      { authenticate: () => ({ id: 'user', metadata: deepMetadata }) },
      {},
    ),
    (error) => error.code === 'invalid_principal',
  )
  await assert.rejects(
    () => authenticateRequest(
      { authenticate: () => ({ id: 'user', metadata: { bad: () => true } }) },
      {},
    ),
    (error) => error.code === 'invalid_principal' && error.status === 401,
  )
  for (const invalid of [
    { id: '' },
    { id: 42 },
    { id: 'x'.repeat(129) },
    { id: 'user', tenant: '' },
    { id: 'user', roles: [''] },
    { id: 'user', roles: Array.from({ length: 65 }, () => 'role') },
  ]) {
    await assert.rejects(
      () => authenticateRequest({ authenticate: () => invalid }, {}),
      (error) => error.code === 'invalid_principal',
    )
  }
})

test('authorization permits authenticated create and denies read/approval by default', async () => {
  const principal = { id: 'user', roles: [] }
  await authorizeRequest(
    {},
    { operation: 'create', request: {}, principal },
  )
  await assert.rejects(
    () => authorizeRequest(
      {},
      { operation: 'read', request: {}, principal, intentId: 'i1' },
    ),
    (error) => error.code === 'forbidden' && error.status === 403,
  )
  await assert.rejects(
    () => authorizeRequest({}, { operation: 'approve', request: {}, principal, intentId: 'i1' }),
    (error) => error.code === 'forbidden' && error.status === 403,
  )

  await authorizeRequest(
    { authorize: async (context) => context.operation === 'approve' },
    { operation: 'approve', request: {}, principal, intentId: 'i1' },
  )
  await assert.rejects(
    () => authorizeRequest(
      { authorize: () => false },
      { operation: 'read', request: {}, principal },
    ),
    (error) => error.code === 'forbidden',
  )
  await assert.rejects(
    () => authorizeRequest(
      { authorize: () => { throw new Error('failure') } },
      { operation: 'read', request: {}, principal },
    ),
    (error) => error.code === 'forbidden',
  )
})

test('trusted context cannot be self-asserted by the HTTP payload', () => {
  const polluted = Object.create(null)
  polluted.locale = 'es-CR'
  polluted.tenant = 'attacker-tenant'
  polluted.user = 'attacker'
  polluted.roles = ['admin']
  polluted.theme = 'dark'
  polluted.nested = { safe: true, constructor: 'blocked', list: [{ __proto__: 'blocked', value: 1 }] }
  Object.defineProperty(polluted, '__proto__', { value: 'blocked', enumerable: true })

  const intent = mergeTrustedIntentContext(
    { type: 'orders.open', payload: {}, context: polluted },
    { id: 'trusted-user', tenant: 'trusted-tenant', roles: ['support'] },
  )
  assert.deepEqual(toPlain(intent.context), {
    locale: 'es-CR',
    theme: 'dark',
    nested: { safe: true, list: [{ value: 1 }] },
    user: 'trusted-user',
    tenant: 'trusted-tenant',
    roles: ['support'],
  })
  assert.equal(Object.getPrototypeOf(intent.context), null)

  const safeRequest = mergeTrustedIntentContext(
    {
      type: 'orders.open',
      payload: { safe: true, nested: { constructor: 'blocked', value: 1 } },
      uiHint: { open: true, target: 'orders' },
      context: undefined,
      ignoredTopLevel: 'not-preserved',
    },
    { id: 'user', roles: undefined },
  )
  assert.deepEqual(toPlain(safeRequest), {
    type: 'orders.open',
    payload: { safe: true, nested: { value: 1 } },
    uiHint: { open: true, target: 'orders' },
    context: { user: 'user', roles: [] },
  })

  const noTenant = mergeTrustedIntentContext(
    { type: 'orders.open', payload: {}, context: undefined },
    { id: 'user', roles: undefined },
  )
  assert.deepEqual(toPlain(noTenant.context), { user: 'user', roles: [] })

  assert.throws(
    () => mergeTrustedIntentContext(
      { type: 'orders.open', payload: {}, context: { bad: () => true } },
      { id: 'user', roles: [] },
    ),
    (error) => error.code === 'invalid_context' && error.status === 400,
  )

  assert.throws(
    () => mergeTrustedIntentContext(
      { type: 'orders.open', payload: { bad: () => true } },
      { id: 'user', roles: [] },
    ),
    (error) => error.code === 'invalid_body' && error.status === 400,
  )

  let tooDeepPayload = {}
  for (let index = 0; index < 22; index += 1) tooDeepPayload = { child: tooDeepPayload }
  assert.throws(
    () => mergeTrustedIntentContext(
      { type: 'orders.open', payload: tooDeepPayload },
      { id: 'user', roles: [] },
    ),
    (error) => error.code === 'invalid_body',
  )

  let tooDeep = {}
  for (let index = 0; index < 22; index += 1) tooDeep = { child: tooDeep }
  assert.throws(
    () => mergeTrustedIntentContext(
      { type: 'orders.open', payload: {}, context: { tooDeep } },
      { id: 'user', roles: [] },
    ),
    (error) => error.code === 'invalid_context',
  )
})

test('rate-limit and idempotency scopes bind operations to trusted identity', () => {
  const principal = { id: 'user/1', tenant: 'tenant:a', roles: [] }
  assert.equal(
    createRateLimitKey('create', principal, '127.0.0.1'),
    'create:tenant%3Aa:user%2F1:127.0.0.1',
  )
  assert.equal(
    createRateLimitKey('read', { id: 'user', roles: [] }),
    'read:-:user:unknown',
  )
  assert.equal(
    createIdempotencyScope('approve', principal, 'intent/1'),
    'approve:tenant%3Aa:user%2F1:intent%2F1',
  )
  assert.equal(
    createIdempotencyScope('create', { id: 'user', roles: [] }),
    'create:-:user:-',
  )
})

test('idempotency keys are normalized and bounded', () => {
  assert.equal(normalizeIdempotencyKey(undefined), undefined)
  assert.equal(normalizeIdempotencyKey('  request-123  '), 'request-123')
  for (const invalid of [
    'short',
    'x'.repeat(129),
    'invalid key',
    'bad/key/value',
  ]) {
    assert.throws(
      () => normalizeIdempotencyKey(invalid),
      (error) =>
        error instanceof NuraHttpSecurityError &&
        error.code === 'invalid_idempotency_key' &&
        error.status === 400,
    )
  }
})

test('security errors expose stable response metadata', () => {
  const error = new NuraHttpSecurityError('forbidden', 'No', 403)
  assert.equal(error.name, 'NuraHttpSecurityError')
  assert.equal(error.code, 'forbidden')
  assert.equal(error.status, 403)
})
