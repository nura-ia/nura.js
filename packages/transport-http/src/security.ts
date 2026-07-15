import type { NIntent } from '@nura-js/intents'

const PRIVILEGED_CONTEXT_KEYS = new Set(['tenant', 'user', 'roles'])
const BLOCKED_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/

export type NuraHttpOperation = 'create' | 'read' | 'approve'

export interface NuraHttpPrincipal {
  id: string
  tenant?: string
  roles?: readonly string[]
  metadata?: Record<string, unknown>
}

export interface NuraHttpRequestContext {
  operation: NuraHttpOperation
  request: unknown
  principal: NuraHttpPrincipal
  intentId?: string
}

export interface NuraHttpSecurityOptions {
  authenticate?: (
    request: unknown,
  ) =>
    | NuraHttpPrincipal
    | null
    | undefined
    | Promise<NuraHttpPrincipal | null | undefined>
  authorize?: (
    context: NuraHttpRequestContext,
  ) => boolean | Promise<boolean>
  /** Local-development escape hatch. Never enable on an internet-facing service. */
  unsafeAllowAnonymous?: boolean
}

export class NuraHttpSecurityError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'NuraHttpSecurityError'
    this.code = code
    this.status = status
  }
}

export function assertSecurityConfigured(
  security: NuraHttpSecurityOptions | undefined,
): NuraHttpSecurityOptions {
  if (security?.authenticate || security?.unsafeAllowAnonymous) {
    return security
  }
  throw new Error(
    'Nura HTTP requires security.authenticate. Set unsafeAllowAnonymous only for local development.',
  )
}

export async function authenticateRequest(
  security: NuraHttpSecurityOptions,
  request: unknown,
): Promise<NuraHttpPrincipal> {
  if (security.authenticate) {
    let principal: NuraHttpPrincipal | null | undefined
    try {
      principal = await security.authenticate(request)
    } catch {
      throw new NuraHttpSecurityError(
        'authentication_failed',
        'Authentication failed',
        401,
      )
    }
    if (!principal) {
      throw new NuraHttpSecurityError(
        'authentication_required',
        'Authentication is required',
        401,
      )
    }
    return normalizePrincipal(principal)
  }

  if (security.unsafeAllowAnonymous) {
    return { id: 'anonymous', roles: [] }
  }

  throw new NuraHttpSecurityError(
    'authentication_required',
    'Authentication is required',
    401,
  )
}

export async function authorizeRequest(
  security: NuraHttpSecurityOptions,
  context: NuraHttpRequestContext,
): Promise<void> {
  let allowed: boolean
  if (security.authorize) {
    try {
      allowed = await security.authorize(context)
    } catch {
      allowed = false
    }
  } else {
    // Creating an intent is allowed after authentication. Reading or
    // approving an existing intent requires an explicit host ownership or
    // approval policy and therefore fails closed.
    allowed = context.operation === 'create'
  }

  if (!allowed) {
    throw new NuraHttpSecurityError(
      'forbidden',
      'The authenticated principal is not allowed to perform this operation',
      403,
    )
  }
}

export function mergeTrustedIntentContext(
  intent: NIntent,
  principal: NuraHttpPrincipal,
): NIntent {
  const context = createSafeObject()
  if (isRecord(intent.context)) {
    for (const [key, value] of Object.entries(intent.context)) {
      if (!PRIVILEGED_CONTEXT_KEYS.has(key) && !BLOCKED_OBJECT_KEYS.has(key)) {
        context[key] = copyJsonValue(value, 0, 'context')
      }
    }
  }
  context.user = principal.id
  if (principal.tenant !== undefined) context.tenant = principal.tenant
  context.roles = [...(principal.roles ?? [])]

  const payload = copyJsonValue(intent.payload, 0, 'payload')
  const uiHint = intent.uiHint
    ? (copySafeRecord(
        intent.uiHint as Record<string, unknown>,
        0,
        'payload',
      ) as NIntent['uiHint'])
    : undefined

  return {
    type: intent.type,
    payload,
    ...(uiHint ? { uiHint } : {}),
    context,
  }
}

export function createRateLimitKey(
  operation: NuraHttpOperation,
  principal: NuraHttpPrincipal,
  ip?: string,
): string {
  return [
    operation,
    principal.tenant ?? '-',
    principal.id,
    ip ?? 'unknown',
  ]
    .map((value) => encodeURIComponent(value))
    .join(':')
}

export function normalizeIdempotencyKey(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (
    normalized.length < 8 ||
    normalized.length > 128 ||
    !IDEMPOTENCY_KEY_PATTERN.test(normalized)
  ) {
    throw new NuraHttpSecurityError(
      'invalid_idempotency_key',
      'Idempotency-Key must be 8-128 characters using letters, numbers, dot, underscore, colon, or hyphen',
      400,
    )
  }
  return normalized
}

export function createIdempotencyScope(
  operation: NuraHttpOperation,
  principal: NuraHttpPrincipal,
  resourceId?: string,
): string {
  return [operation, principal.tenant ?? '-', principal.id, resourceId ?? '-']
    .map((value) => encodeURIComponent(value))
    .join(':')
}

function normalizePrincipal(principal: NuraHttpPrincipal): NuraHttpPrincipal {
  const id = normalizeIdentityValue(principal.id, 'principal id')
  const tenant =
    principal.tenant === undefined
      ? undefined
      : normalizeIdentityValue(principal.tenant, 'tenant')
  const roles = principal.roles ?? []
  if (roles.length > 64) {
    throw new NuraHttpSecurityError(
      'invalid_principal',
      'A principal may not contain more than 64 roles',
      401,
    )
  }

  return {
    id,
    ...(tenant ? { tenant } : {}),
    roles: Array.from(
      new Set(roles.map((role) => normalizeIdentityValue(role, 'role'))),
    ),
    ...(principal.metadata
      ? { metadata: copySafeRecord(principal.metadata, 0, 'principal') }
      : {}),
  }
}

function normalizeIdentityValue(value: string, field: string): string {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized || normalized.length > 128) {
    throw new NuraHttpSecurityError(
      'invalid_principal',
      `${field} must contain between 1 and 128 characters`,
      401,
    )
  }
  return normalized
}

type SafeCopySource = 'principal' | 'context' | 'payload'

function copySafeRecord(
  value: Record<string, unknown>,
  depth: number,
  source: SafeCopySource,
): Record<string, unknown> {
  assertSafeDepth(depth, source)

  const output = createSafeObject()
  for (const [key, entry] of Object.entries(value)) {
    if (BLOCKED_OBJECT_KEYS.has(key)) continue
    output[key] = copyJsonValue(entry, depth + 1, source)
  }
  return output
}

function copyJsonValue(
  value: unknown,
  depth: number,
  source: SafeCopySource,
): unknown {
  assertSafeDepth(depth, source)
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((entry) => copyJsonValue(entry, depth + 1, source))
  }
  if (isRecord(value)) return copySafeRecord(value, depth, source)
  throw new NuraHttpSecurityError(
    source === 'principal'
      ? 'invalid_principal'
      : source === 'context'
        ? 'invalid_context'
        : 'invalid_body',
    source === 'principal'
      ? 'Trusted principal metadata must contain only JSON values'
      : source === 'context'
        ? 'Intent context must contain only JSON values'
        : 'Intent payload and UI hints must contain only JSON values',
    source === 'principal' ? 401 : 400,
  )
}

function assertSafeDepth(depth: number, source: SafeCopySource): void {
  if (depth <= 20) return
  throw new NuraHttpSecurityError(
    source === 'principal'
      ? 'invalid_principal'
      : source === 'context'
        ? 'invalid_context'
        : 'invalid_body',
    source === 'principal'
      ? 'Trusted principal metadata exceeds the maximum nesting depth'
      : source === 'context'
        ? 'Intent context exceeds the maximum nesting depth'
        : 'Intent payload or UI hints exceed the maximum nesting depth',
    source === 'principal' ? 401 : 400,
  )
}

function createSafeObject(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
