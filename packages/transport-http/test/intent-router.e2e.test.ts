// @ts-nocheck
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  AjvSchemaValidator,
  ConsoleAuditLogger,
  Hex36IdGenerator,
  InMemoryIdempotencyStore,
  InMemoryIntentRegistry,
  InMemoryIntentStore,
  IntentService,
  NoopRateLimiter,
  type RateLimiter,
  SimplePolicyEngine,
} from '@nura-js/intents'
import {
  buildRouter,
  type NuraHttpSecurityOptions,
} from '../src/index.js'

describe('createIntentRouter', () => {
  let executions = 0
  let app: any
  let registry: any
  let service: any

  const security: NuraHttpSecurityOptions = {
    authenticate: () => ({
      id: 'test-user',
      tenant: 'test-tenant',
      roles: ['approver'],
    }),
    authorize: ({ operation, principal }) =>
      operation !== 'approve' || principal.roles?.includes('approver') === true,
  }

  beforeEach(() => {
    executions = 0
    registry = new InMemoryIntentRegistry()
    service = new IntentService(
      registry,
      new AjvSchemaValidator(),
      new SimplePolicyEngine(),
      new InMemoryIntentStore(),
      new ConsoleAuditLogger(),
      new Hex36IdGenerator(),
    )

    registry.register({
      type: 'echo.intent',
      schema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
        additionalProperties: false,
      },
      executor: async (payload) => {
        executions += 1
        return { type: 'echo.intent.result', payload }
      },
    })

    registry.register({
      type: 'approval.intent',
      schema: { type: 'object', additionalProperties: true },
      policy: { requiresApproval: true },
      executor: async (payload) => {
        executions += 1
        return { type: 'approval.intent.result', payload }
      },
    })

    registry.register({
      type: 'admin.intent',
      schema: { type: 'object', additionalProperties: true },
      policy: { roles: ['admin'] },
      executor: async (payload) => {
        executions += 1
        return { type: 'admin.intent.result', payload }
      },
    })

    app = express()
    app.use(
      buildRouter({
        service,
        security,
        rateLimit: new NoopRateLimiter(),
        idempotency: {
          store: new InMemoryIdempotencyStore(),
          ttlSeconds: 60,
        },
      }),
    )
  })

  it('requires explicit HTTP security configuration', () => {
    expect(() => buildRouter({ service })).toThrow(/security\.authenticate/)
  })

  it('returns 401 when authentication fails', async () => {
    const protectedApp = express()
    protectedApp.use(
      buildRouter({
        service,
        security: { authenticate: () => null },
      }),
    )

    const response = await request(protectedApp)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'echo.intent', payload: { message: 'hi' } })

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('authentication_required')
  })

  it('returns 422 for unknown intent types', async () => {
    const response = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'missing', payload: {} })

    expect(response.status).toBe(422)
    expect(response.body.error).toBe('unknown_intent')
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('queues intents that require approval', async () => {
    const response = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({
        type: 'approval.intent',
        payload: { message: 'needs approval' },
      })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('requires_approval')
    expect(response.body.intentId).toBeTruthy()
  })

  it('does not trust roles, tenant, or user supplied in the request body', async () => {
    const response = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({
        type: 'admin.intent',
        payload: {},
        context: {
          tenant: 'attacker-tenant',
          user: 'attacker',
          roles: ['admin'],
          locale: 'es-CR',
        },
      })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('requires_approval')
    expect(executions).toBe(0)
  })

  it('approves intents and is idempotent on repeat calls', async () => {
    const createResponse = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'approval.intent', payload: { value: 1 } })

    const intentId = createResponse.body.intentId
    expect(intentId).toBeTruthy()

    const approveResponse = await request(app)
      .post(`/ai/intents/${intentId}/approve`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Idempotency-Key', 'approval-request-1')
      .send({})

    expect(approveResponse.status).toBe(200)
    expect(approveResponse.body.status).toBe('done')
    expect(approveResponse.body.result).toMatchObject({
      type: 'approval.intent.result',
    })
    expect(executions).toBe(1)

    const secondApprove = await request(app)
      .post(`/ai/intents/${intentId}/approve`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Idempotency-Key', 'approval-request-1')
      .send({})

    expect(secondApprove.status).toBe(200)
    expect(secondApprove.body.status).toBe('done')
    expect(executions).toBe(1)
  })

  it('denies reads when the host has no ownership authorizer', async () => {
    const deniedApp = express()
    deniedApp.use(
      buildRouter({
        service,
        security: {
          authenticate: () => ({ id: 'user', roles: ['user'] }),
        },
      }),
    )

    const created = await request(deniedApp)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'echo.intent', payload: { message: 'private' } })

    const response = await request(deniedApp)
      .get(`/ai/intents/${created.body.intentId}`)
      .set('Accept', 'application/json')

    expect(response.status).toBe(403)
    expect(response.body.error).toBe('forbidden')
  })

  it('rejects browser origins outside the configured allowlist', async () => {
    const corsApp = express()
    corsApp.use(
      buildRouter({
        service,
        security,
        cors: { origins: ['https://app.nura.dev'] },
      }),
    )

    const denied = await request(corsApp)
      .post('/ai/intents')
      .set('Origin', 'https://attacker.example')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'echo.intent', payload: { message: 'blocked' } })

    expect(denied.status).toBe(403)
    expect(denied.body.error).toBe('origin_not_allowed')

    const allowed = await request(corsApp)
      .options('/ai/intents')
      .set('Origin', 'https://app.nura.dev')

    expect(allowed.status).toBe(204)
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://app.nura.dev',
    )
  })

  it('denies approval when the host has no approval authorizer', async () => {
    const deniedApp = express()
    deniedApp.use(
      buildRouter({
        service,
        security: {
          authenticate: () => ({ id: 'user', roles: ['user'] }),
        },
      }),
    )

    const created = await request(deniedApp)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'approval.intent', payload: {} })

    const response = await request(deniedApp)
      .post(`/ai/intents/${created.body.intentId}/approve`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({})

    expect(response.status).toBe(403)
    expect(response.body.error).toBe('forbidden')
  })

  it('rejects unsupported media types and malformed JSON', async () => {
    const unsupported = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'text/plain')
      .set('Accept', 'application/json')
      .send('invalid')

    expect(unsupported.status).toBe(415)
    expect(unsupported.body.error).toBe('unsupported_media_type')

    const malformed = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send('{')

    expect(malformed.status).toBe(400)
    expect(malformed.body.error).toBe('invalid_json')
  })

  it('returns 413 for JSON bodies above the configured limit', async () => {
    const limitedBodyApp = express()
    limitedBodyApp.use(
      buildRouter({
        service,
        security,
        limits: { body: '128b' },
      }),
    )

    const response = await request(limitedBodyApp)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({
        type: 'echo.intent',
        payload: { message: 'x'.repeat(512) },
      })

    expect(response.status).toBe(413)
    expect(response.body.error).toBe('payload_too_large')
  })

  it('rejects malformed idempotency keys', async () => {
    const response = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Idempotency-Key', 'bad key')
      .send({ type: 'echo.intent', payload: { message: 'hi' } })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_idempotency_key')
  })

  it('limits requests when the rate limiter denies access', async () => {
    const limitedApp = express()
    const limiter = new DenyRateLimiter()
    limitedApp.use(
      buildRouter({
        service,
        security,
        rateLimit: limiter,
        idempotency: {
          store: new InMemoryIdempotencyStore(),
          ttlSeconds: 30,
        },
      }),
    )

    const response = await request(limitedApp)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'echo.intent', payload: { message: 'hi' } })

    expect(response.status).toBe(429)
    expect(response.body.error).toBe('rate_limited')
  })

  it('retrieves intent status via GET', async () => {
    const createResponse = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'echo.intent', payload: { message: 'read me' } })

    const intentId = createResponse.body.intentId
    expect(intentId).toBeTruthy()

    const getResponse = await request(app)
      .get(`/ai/intents/${intentId}`)
      .set('Accept', 'application/json')

    expect(getResponse.status).toBe(200)
    expect(getResponse.body.status).toBe('done')
    expect(getResponse.body.result).toMatchObject({
      type: 'echo.intent.result',
    })
  })
})

class DenyRateLimiter implements RateLimiter {
  async check(): Promise<boolean> {
    return false
  }
}
