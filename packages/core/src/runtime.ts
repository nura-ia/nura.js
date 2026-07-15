import { evaluatePermission } from './permissions'
import type {
  NAction,
  NActionSpec,
  NPermissionRule,
  NRegistry,
  NResult,
} from './types'

export interface ExecuteNuraActionOptions {
  dispatch?: (action: NAction) => Promise<NResult> | NResult
  spec?: NActionSpec
}

/**
 * Public facade for executing actions registered in an NRegistry.
 */
export class Nura {
  #registry: NRegistry
  #started = false

  constructor(options: { registry: NRegistry }) {
    this.#registry = options.registry
  }

  start(): void {
    if (this.#started) return
    this.#started = true

    const browser =
      typeof document !== 'undefined' && typeof CustomEvent !== 'undefined'
    safeEmit(this.#registry, 'runtime.started', {
      appId: this.#registry.config.app.id,
      browser,
    })

    if (browser) {
      document.dispatchEvent(new CustomEvent('nura:started'))
    }
  }

  act(action: NAction): Promise<NResult> {
    return executeNuraAction(this.#registry, action)
  }
}

export async function executeNuraAction(
  registry: NRegistry,
  action: NAction,
  options: ExecuteNuraActionOptions = {},
): Promise<NResult> {
  const actor = registry.config.actor?.()
  const scope = resolveActionScope(action, registry.config)
  const actionType = getActionType(action)
  const spec = options.spec ?? findActionSpec(registry, action)

  if (spec?.validate) {
    let valid = false
    try {
      valid = spec.validate('type' in action ? action.payload : undefined)
    } catch {
      valid = false
    }
    if (!valid) {
      return deny(registry, action, actor, scope, 'invalid:payload')
    }
  }

  const decision = await evaluatePermission({
    permissions: registry.permissions,
    scope,
    actionType,
    actor,
    action,
    defaultPolicy: registry.config.defaultPolicy,
  })

  if (!decision.allowed) {
    return deny(
      registry,
      action,
      actor,
      scope,
      decision.reason as string,
    )
  }

  if (decision.policy === 'confirm' || requiresConfirmation(action)) {
    const confirm = registry.config.confirm ?? defaultConfirm
    let confirmed = false
    try {
      confirmed = await Promise.resolve(
        confirm({
          action,
          scope,
          rule: decision.rule,
          actor,
        }),
      )
    } catch {
      confirmed = false
    }
    if (!confirmed) {
      return deny(registry, action, actor, scope, 'cancelled:confirm')
    }
  }

  safeEmit(registry, 'permission.allowed', {
    actionType,
    scope,
    actorId: actor?.id,
    tenant: actor?.tenant,
  })
  safeEmit(registry, 'action.started', {
    actionType,
    scope,
    actorId: actor?.id,
    tenant: actor?.tenant,
  })

  try {
    const dispatch = options.dispatch ?? registry.actions.dispatch
    const result = await dispatch(action)

    safeAudit(registry, {
      action,
      actor,
      scope,
      allowed: true,
      result,
      timestamp: Date.now(),
    })

    safeEmit(registry, result.ok ? 'action.completed' : 'action.failed', {
      actionType,
      scope,
      actorId: actor?.id,
      tenant: actor?.tenant,
      ok: result.ok,
      code: result.code,
      message: result.message,
    })

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown action error'
    const result: NResult = {
      ok: false,
      code: 'ACTION_EXECUTION_FAILED',
      message,
    }

    safeAudit(registry, {
      action,
      actor,
      scope,
      allowed: true,
      result,
      timestamp: Date.now(),
    })
    safeEmit(registry, 'action.failed', {
      actionType,
      scope,
      actorId: actor?.id,
      tenant: actor?.tenant,
      ok: false,
      code: result.code,
      message,
    })

    return result
  }
}

export function resolveActionScope(
  action: NAction,
  config: NRegistry['config'],
): string | undefined {
  const resolved = config.resolveScope?.(action)
  if (resolved) return resolved
  if ('scope' in action) return action.scope
  return action.target
}

export function getActionType(action: NAction): string | undefined {
  if ('type' in action) return action.type
  return action.verb
}

export function requiresConfirmation(action: NAction): boolean {
  if ('type' in action) return action.meta?.requireConfirm === true
  return action.metadata?.requireConfirm === true
}

function findActionSpec(
  registry: NRegistry,
  action: NAction,
): NActionSpec | undefined {
  if (!('type' in action)) return undefined
  return registry.actions.listSpecs().find((spec) => {
    if (spec.type !== action.type) return false
    const specTarget = spec.target ?? spec.scope
    return specTarget === action.target
  })
}

function deny(
  registry: NRegistry,
  action: NAction,
  actor: ReturnType<NonNullable<NRegistry['config']['actor']>> | undefined,
  scope: string | undefined,
  reason: string,
): NResult {
  const actionType = getActionType(action)
  const result: NResult = { ok: false, message: reason }

  safeAudit(registry, {
    action,
    actor,
    scope,
    allowed: false,
    reason,
    result,
    timestamp: Date.now(),
  })
  safeEmit(registry, 'permission.denied', {
    actionType,
    scope,
    actorId: actor?.id,
    tenant: actor?.tenant,
    reason,
  })

  return result
}


function safeAudit(
  registry: NRegistry,
  entry: Parameters<NonNullable<NRegistry['audit']>['log']>[0],
): void {
  try {
    registry.audit?.log(entry)
  } catch {
    // Audit backends are important, but they must not corrupt action results.
  }
}

function safeEmit(
  registry: NRegistry,
  event: string,
  payload: Record<string, unknown>,
): void {
  try {
    registry.telemetry.emit(event, payload)
  } catch {
    // Telemetry is an observer and must not become an execution dependency.
  }
}

function defaultConfirm(context: {
  action: NAction
  scope?: string
  rule?: NPermissionRule
}): boolean {
  void context
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm('Confirm action?')
  }
  return false
}

export type { NActionMeta, NActionSpecMeta } from './types/action'
