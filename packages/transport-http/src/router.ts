import type { Request, Response, NextFunction } from 'express';
import { Router, json } from 'express';
import {
  IntentError,
  IntentService,
  NoopRateLimiter,
  intentService as defaultIntentService,
  type IdempotencyStore,
  type NIntent,
  type NIntentResponse,
  type RateLimiter,
} from '@nurajs/intents';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface BuildRouterOptions {
  service?: IntentService;
  cors?: { origins: string[] };
  limits?: { body?: string };
  rateLimit?: RateLimiter | RateLimitConfig;
  idempotency?: { store: IdempotencyStore; ttlSeconds?: number };
}

export type IntentRouterOptions = BuildRouterOptions;

const DEFAULT_BODY_LIMIT = '64kb';
const DEFAULT_IDEMPOTENCY_TTL = 30;

export function buildRouter(options: BuildRouterOptions = {}): Router {
  const router = Router();
  const service = options.service ?? defaultIntentService;
  const rateLimiter = createRateLimiter(options.rateLimit);
  const bodyLimit = options.limits?.body ?? DEFAULT_BODY_LIMIT;
  const idempotencyStore = options.idempotency?.store;
  const idempotencyTtl = options.idempotency?.ttlSeconds ?? DEFAULT_IDEMPOTENCY_TTL;

  if (options.cors) {
    router.use(createCorsMiddleware(options.cors.origins));
  }

  router.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'POST,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Accept,Idempotency-Key');
      return res.sendStatus(204);
    }

    const acceptsJson = !req.headers.accept || req.accepts('json');
    if (!acceptsJson) {
      return res.status(406).json({ error: 'not_acceptable', message: 'Accept header must allow application/json' });
    }

    next();
  });

  const jsonParser = json({ limit: bodyLimit });

  router.post(
    '/ai/intents',
    enforceJsonContentType,
    jsonParser,
    createRateLimitMiddleware(rateLimiter),
    asyncHandler(async (req, res) => {
      const body = req.body;
      if (!isIntentCandidate(body)) {
        res.status(400).json({ error: 'invalid_body', message: 'Body must be a JSON object with type and payload' });
        return;
      }

      const intent = body as NIntent;
      await handleWithIdempotency({
        idempotencyStore,
        ttl: idempotencyTtl,
        request: req,
        scope: 'create',
        handler: () => service.createIntent(intent),
        respond: response => {
          res.status(200).json(response);
        },
      });
    }),
  );

  router.post(
    '/ai/intents/:id/approve',
    enforceJsonContentType,
    jsonParser,
    createRateLimitMiddleware(rateLimiter),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      await handleWithIdempotency({
        idempotencyStore,
        ttl: idempotencyTtl,
        request: req,
        scope: `approve:${id}`,
        handler: () => service.approveIntent(id),
        respond: response => {
          res.status(200).json(response);
        },
      });
    }),
  );

  router.get(
    '/ai/intents/:id',
    createRateLimitMiddleware(rateLimiter),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const response = await service.getIntent(id);
      res.status(200).json(response);
    }),
  );

  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof IntentError) {
      return res.status(err.status).json({ error: err.code, message: err.message, details: err.details });
    }

    return res.status(500).json({ error: 'internal_error', message: 'Unexpected error' });
  });

  return router;
}

export function createIntentRouter(options: IntentRouterOptions = {}): Router {
  return buildRouter(options);
}

function enforceJsonContentType(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers['content-type'];
  if (!contentType) {
    return res.status(415).json({ error: 'unsupported_media_type', message: 'Content-Type must be application/json' });
  }

  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'unsupported_media_type', message: 'Content-Type must be application/json' });
  }

  next();
}

function createRateLimitMiddleware(rateLimiter: RateLimiter) {
  return async function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? 'unknown';
    const allowed = await rateLimiter.check(key);
    if (!allowed) {
      return res.status(429).json({ error: 'rate_limited', message: 'Too many requests' });
    }

    next();
  };
}

function createRateLimiter(input: RateLimitConfig | RateLimiter | undefined): RateLimiter {
  if (!input) {
    return new NoopRateLimiter();
  }

  if (typeof (input as RateLimiter).check === 'function') {
    return input as RateLimiter;
  }

  const config = input as RateLimitConfig;
  return new WindowRateLimiter(config.windowMs, config.max);
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return function wrapped(req: Request, res: Response, next: NextFunction) {
    fn(req, res, next).catch(next);
  };
}

interface IdempotencyContext {
  idempotencyStore?: IdempotencyStore;
  ttl: number;
  request: Request;
  scope: string;
  handler: () => Promise<NIntentResponse>;
  respond: (response: NIntentResponse) => void;
}

async function handleWithIdempotency(context: IdempotencyContext): Promise<void> {
  const key = context.request.header('Idempotency-Key');
  if (!key || !context.idempotencyStore) {
    const response = await context.handler();
    context.respond(response);
    return;
  }

  const scopedKey = `${context.scope}:${key}`;
  const cached = await context.idempotencyStore.get(scopedKey);
  if (cached) {
    context.respond(cached);
    return;
  }

  const response = await context.handler();
  await context.idempotencyStore.set(scopedKey, response, context.ttl);
  context.respond(response);
}

function createCorsMiddleware(allowOrigins: string[]) {
  const allowAll = allowOrigins.includes('*');
  return function cors(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin;
    if (origin && (allowAll || allowOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    next();
  };
}

class WindowRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly windowMs: number, private readonly max: number) {}

  async check(key: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.hits.set(key, { count: 1, expiresAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.max) {
      return false;
    }

    entry.count += 1;
    this.hits.set(key, entry);
    return true;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface IntentCandidate {
  type: string;
  payload: unknown;
  uiHint?: NIntent['uiHint'];
  context?: NIntent['context'];
}

function isIntentCandidate(value: unknown): value is IntentCandidate {
  if (!isObject(value)) {
    return false;
  }

  return typeof value.type === 'string' && Object.prototype.hasOwnProperty.call(value, 'payload');
}
