import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
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
} from '@nurajs/intents';
import { buildRouter } from '../src/router.js';

describe('createIntentRouter', () => {
  let executions = 0;
  let app: express.Express;
  let registry: InMemoryIntentRegistry;
  let service: IntentService;

  beforeEach(() => {
    executions = 0;
    registry = new InMemoryIntentRegistry();
    service = new IntentService(
      registry,
      new AjvSchemaValidator(),
      new SimplePolicyEngine(),
      new InMemoryIntentStore(),
      new ConsoleAuditLogger(),
      new Hex36IdGenerator(),
    );

    registry.register({
      type: 'echo.intent',
      schema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
        additionalProperties: false,
      },
      executor: async payload => {
        executions += 1;
        return { type: 'echo.intent.result', payload };
      },
    });

    registry.register({
      type: 'approval.intent',
      schema: { type: 'object', additionalProperties: true },
      policy: { requiresApproval: true },
      executor: async payload => {
        executions += 1;
        return { type: 'approval.intent.result', payload };
      },
    });

    app = express();
    app.use(
      buildRouter({
        service,
        rateLimit: new NoopRateLimiter(),
        idempotency: { store: new InMemoryIdempotencyStore(), ttlSeconds: 60 },
      }),
    );
  });

  it('returns 422 for unknown intent types', async () => {
    const response = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'missing', payload: {} });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('unknown_intent');
  });

  it('queues intents that require approval', async () => {
    const response = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'approval.intent', payload: { message: 'needs approval' } });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('requires_approval');
    expect(response.body.intentId).toBeTruthy();
  });

  it('approves intents and is idempotent on repeat calls', async () => {
    const createResponse = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'approval.intent', payload: { value: 1 } });

    const intentId = createResponse.body.intentId;
    expect(intentId).toBeTruthy();

    const approveResponse = await request(app)
      .post(`/ai/intents/${intentId}/approve`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({});

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.status).toBe('done');
    expect(approveResponse.body.result).toMatchObject({ type: 'approval.intent.result' });
    expect(executions).toBe(1);

    const secondApprove = await request(app)
      .post(`/ai/intents/${intentId}/approve`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({});

    expect(secondApprove.status).toBe(200);
    expect(secondApprove.body.status).toBe('done');
    expect(executions).toBe(1);
  });

  it('rejects unsupported media types', async () => {
    const response = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'text/plain')
      .set('Accept', 'application/json')
      .send('invalid');

    expect(response.status).toBe(415);
    expect(response.body.error).toBe('unsupported_media_type');
  });

  it('limits requests when the rate limiter denies access', async () => {
    const limitedApp = express();
    const limiter = new DenyRateLimiter();
    limitedApp.use(
      buildRouter({
        service,
        rateLimit: limiter,
        idempotency: { store: new InMemoryIdempotencyStore(), ttlSeconds: 30 },
      }),
    );

    const response = await request(limitedApp)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'echo.intent', payload: { message: 'hi' } });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('rate_limited');
  });
  it('retrieves intent status via GET', async () => {
    const createResponse = await request(app)
      .post('/ai/intents')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ type: 'echo.intent', payload: { message: 'read me' } });

    const intentId = createResponse.body.intentId;
    expect(intentId).toBeTruthy();

    const getResponse = await request(app)
      .get(`/ai/intents/${intentId}`)
      .set('Accept', 'application/json');

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.status).toBe('done');
    expect(getResponse.body.result).toMatchObject({ type: 'echo.intent.result' });
  });
});

class DenyRateLimiter implements RateLimiter {
  async check(): Promise<boolean> {
    return false;
  }
}
