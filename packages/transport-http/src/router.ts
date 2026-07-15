import type { NextFunction, Request, Response } from 'express'
import { Router, json } from 'express'
import {
  IntentError,
  IntentService,
  NoopRateLimiter,
  intentService as defaultIntentService,
  type IdempotencyStore,
  type NIntent,
  type NIntentResponse,
  type RateLimiter,
} from '@nura-js/intents'
import {
  NuraHttpSecurityError,
  assertSecurityConfigured,
  authenticateRequest,
  authorizeRequest,
  createIdempotencyScope,
  createRateLimitKey,
  mergeTrustedIntentContext,
  normalizeIdempotencyKey,
  type NuraHttpOperation,
  type NuraHttpPrincipal,
  type NuraHttpSecurityOptions,
} from './security.js'

export interface RateLimitConfig {
  windowMs: number
  max: number
  maxKeys?: number
}

export interface BuildRouterOptions {
  service?: IntentService
  cors?: { origins: string[] }
  limits?: { body?: string }
  rateLimit?: RateLimiter | RateLimitConfig
  idempotency?: { store: IdempotencyStore; ttlSeconds?: number }
  security?: NuraHttpSecurityOptions
}

export type IntentRouterOptions = BuildRouterOptions

const DEFAULT_BODY_LIMIT = '64kb'
const DEFAULT_IDEMPOTENCY_TTL = 30
const DEFAULT_RATE_LIMIT_KEYS = 10_000

export function buildRouter(options: BuildRouterOptions = {}): Router {
  const router = Router()
  const service = options.service ?? defaultIntentService
  const rateLimiter = createRateLimiter(options.rateLimit)
  const bodyLimit = options.limits?.body ?? DEFAULT_BODY_LIMIT
  const idempotencyStore = options.idempotency?.store
  const idempotencyTtl = options.idempotency?.ttlSeconds ?? DEFAULT_IDEMPOTENCY_TTL
  const security = assertSecurityConfigured(options.security)
  const principals = new WeakMap<Request, NuraHttpPrincipal>()

  if (options.cors) {
    router.use(createCorsMiddleware(options.cors.origins))
  }

  router.use((_req, res, next) => {
    res.header('Cache-Control', 'no-store')
    res.header('X-Content-Type-Options', 'nosniff')
    next()
  })

  router.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.header(
        'Access-Control-Allow-Headers',
        'Authorization,Content-Type,Accept,Idempotency-Key,X-Nura-Request-Id',
      )
      return res.sendStatus(204)
    }

    const acceptsJson = !req.headers.accept || req.accepts('json')
    if (!acceptsJson) {
      return res.status(406).json({
        error: 'not_acceptable',
        message: 'Accept header must allow application/json',
      })
    }

    next()
  })

  const jsonParser = json({ limit: bodyLimit })

  router.post(
    '/ai/intents',
    enforceJsonContentType,
    authenticateOperation(security, principals),
    createRateLimitMiddleware(rateLimiter, principals, 'create'),
    jsonParser,
    authorizeOperation(security, principals, 'create'),
    asyncHandler(async (req, res) => {
      const body = req.body
      if (!isIntentCandidate(body)) {
        res.status(400).json({
          error: 'invalid_body',
          message: 'Body must be a JSON object with type and payload',
        })
        return
      }

      const principal = requirePrincipal(principals, req)
      const intent = mergeTrustedIntentContext(body as NIntent, principal)
      await handleWithIdempotency({
        idempotencyStore,
        ttl: idempotencyTtl,
        idempotencyKey: normalizeIdempotencyKey(
          req.header('Idempotency-Key') ?? undefined,
        ),
        scope: createIdempotencyScope('create', principal),
        handler: () => service.createIntent(intent),
        respond: (response) => {
          res.status(200).json(response)
        },
      })
    }),
  )

  router.post(
    '/ai/intents/:id/approve',
    enforceJsonContentType,
    authenticateOperation(security, principals),
    createRateLimitMiddleware(rateLimiter, principals, 'approve'),
    jsonParser,
    authorizeOperation(security, principals, 'approve'),
    asyncHandler(async (req, res) => {
      const { id } = req.params
      const principal = requirePrincipal(principals, req)
      await handleWithIdempotency({
        idempotencyStore,
        ttl: idempotencyTtl,
        idempotencyKey: normalizeIdempotencyKey(
          req.header('Idempotency-Key') ?? undefined,
        ),
        scope: createIdempotencyScope('approve', principal, id),
        handler: () => service.approveIntent(id),
        respond: (response) => {
          res.status(200).json(response)
        },
      })
    }),
  )

  router.get(
    '/ai/intents/:id',
    authenticateOperation(security, principals),
    createRateLimitMiddleware(rateLimiter, principals, 'read'),
    authorizeOperation(security, principals, 'read'),
    asyncHandler(async (req, res) => {
      const { id } = req.params
      const response = await service.getIntent(id)
      res.status(200).json(response)
    }),
  )

  router.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof NuraHttpSecurityError) {
        return res.status(err.status).json({
          error: err.code,
          message: err.message,
        })
      }

      if (err instanceof IntentError) {
        return res.status(err.status).json({
          error: err.code,
          message: err.message,
          details: err.details,
        })
      }

      if (isBodyParserError(err)) {
        const tooLarge = err.type === 'entity.too.large'
        return res.status(err.status).json({
          error: tooLarge ? 'payload_too_large' : 'invalid_json',
          message: tooLarge
            ? 'Request body exceeds the configured limit'
            : 'Request body is not valid JSON',
        })
      }

      return res
        .status(500)
        .json({ error: 'internal_error', message: 'Unexpected error' })
    },
  )

  return router
}

export function createIntentRouter(
  options: IntentRouterOptions = {},
): Router {
  return buildRouter(options)
}

function enforceJsonContentType(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const contentType = req.headers['content-type']
  if (!contentType || !req.is('application/json')) {
    return res.status(415).json({
      error: 'unsupported_media_type',
      message: 'Content-Type must be application/json',
    })
  }

  next()
}

function authenticateOperation(
  security: NuraHttpSecurityOptions,
  principals: WeakMap<Request, NuraHttpPrincipal>,
) {
  return asyncHandler(async (req, _res, next) => {
    const principal = await authenticateRequest(security, req)
    principals.set(req, principal)
    next()
  })
}

function authorizeOperation(
  security: NuraHttpSecurityOptions,
  principals: WeakMap<Request, NuraHttpPrincipal>,
  operation: NuraHttpOperation,
) {
  return asyncHandler(async (req, _res, next) => {
    const principal = requirePrincipal(principals, req)
    await authorizeRequest(security, {
      operation,
      request: req,
      principal,
      ...(req.params.id ? { intentId: req.params.id } : {}),
    })
    next()
  })
}

function requirePrincipal(
  principals: WeakMap<Request, NuraHttpPrincipal>,
  request: Request,
): NuraHttpPrincipal {
  const principal = principals.get(request)
  if (!principal) {
    throw new NuraHttpSecurityError(
      'authentication_required',
      'Authentication is required',
      401,
    )
  }
  return principal
}

function createRateLimitMiddleware(
  rateLimiter: RateLimiter,
  principals: WeakMap<Request, NuraHttpPrincipal>,
  operation: NuraHttpOperation,
) {
  return asyncHandler(async (req, res, next) => {
    const principal = requirePrincipal(principals, req)
    const key = createRateLimitKey(operation, principal, req.ip)
    const allowed = await rateLimiter.check(key)
    if (!allowed) {
      res.status(429).json({
        error: 'rate_limited',
        message: 'Too many requests',
      })
      return
    }

    next()
  })
}

function createRateLimiter(
  input: RateLimitConfig | RateLimiter | undefined,
): RateLimiter {
  if (!input) return new NoopRateLimiter()
  if (typeof (input as RateLimiter).check === 'function') {
    return input as RateLimiter
  }

  const config = input as RateLimitConfig
  return new WindowRateLimiter(
    config.windowMs,
    config.max,
    config.maxKeys ?? DEFAULT_RATE_LIMIT_KEYS,
  )
}

function asyncHandler(
  fn: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void>,
) {
  return function wrapped(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    fn(req, res, next).catch(next)
  }
}

interface IdempotencyContext {
  idempotencyStore?: IdempotencyStore
  ttl: number
  idempotencyKey?: string
  scope: string
  handler: () => Promise<NIntentResponse>
  respond: (response: NIntentResponse) => void
}

async function handleWithIdempotency(
  context: IdempotencyContext,
): Promise<void> {
  if (!context.idempotencyKey || !context.idempotencyStore) {
    const response = await context.handler()
    context.respond(response)
    return
  }

  const scopedKey = `${context.scope}:${context.idempotencyKey}`
  const cached = await context.idempotencyStore.get(scopedKey)
  if (cached) {
    context.respond(cached)
    return
  }

  const response = await context.handler()
  await context.idempotencyStore.set(scopedKey, response, context.ttl)
  context.respond(response)
}

function createCorsMiddleware(allowOrigins: string[]) {
  const allowAll = allowOrigins.includes('*')
  return function cors(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin
    if (!origin) {
      next()
      return
    }
    if (!allowAll && !allowOrigins.includes(origin)) {
      res.status(403).json({
        error: 'origin_not_allowed',
        message: 'Request origin is not allowed',
      })
      return
    }
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Vary', 'Origin')
    next()
  }
}

class WindowRateLimiter implements RateLimiter {
  private readonly hits = new Map<
    string,
    { count: number; expiresAt: number }
  >()
  private lastPrune = 0

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
    private readonly maxKeys: number,
  ) {
    if (
      !Number.isFinite(windowMs) ||
      windowMs <= 0 ||
      !Number.isInteger(max) ||
      max <= 0 ||
      !Number.isInteger(maxKeys) ||
      maxKeys <= 0
    ) {
      throw new Error('Invalid Nura HTTP rate-limit configuration')
    }
  }

  async check(key: string): Promise<boolean> {
    const now = Date.now()
    if (now - this.lastPrune >= this.windowMs) {
      this.prune(now)
      this.lastPrune = now
    }

    const entry = this.hits.get(key)
    if (!entry || entry.expiresAt <= now) {
      if (!entry && this.hits.size >= this.maxKeys) return false
      this.hits.set(key, {
        count: 1,
        expiresAt: now + this.windowMs,
      })
      return true
    }

    if (entry.count >= this.max) return false

    entry.count += 1
    return true
  }

  private prune(now: number): void {
    for (const [key, entry] of this.hits) {
      if (entry.expiresAt <= now) this.hits.delete(key)
    }
  }
}

function isBodyParserError(
  value: unknown,
): value is { status: 400 | 413; type: 'entity.parse.failed' | 'entity.too.large' } {
  if (!isObject(value)) return false
  return (
    (value.type === 'entity.parse.failed' && value.status === 400) ||
    (value.type === 'entity.too.large' && value.status === 413)
  )
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

interface IntentCandidate {
  type: string
  payload: unknown
  uiHint?: NIntent['uiHint']
  context?: NIntent['context']
}

function isIntentCandidate(value: unknown): value is IntentCandidate {
  if (!isObject(value) || Array.isArray(value)) return false
  return (
    typeof value.type === 'string' &&
    value.type.length > 0 &&
    Object.prototype.hasOwnProperty.call(value, 'payload')
  )
}
