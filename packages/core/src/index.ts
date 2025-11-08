import type {
  NRegistry,
  NAction,
  NResult,
  NActor,
  NPermissionRule,
} from './types'
import { decidePolicy, hasRole, pickRule } from './permissions'

/**
 * Public façade for executing actions registered in a {@link NRegistry}.
 * The instance coordinates permission checks, optional confirmation prompts,
 * and telemetry emission when actions run.
 */
export class Nura {
  #registry: NRegistry
  #started = false

  constructor(opts: { registry: NRegistry }) {
    this.#registry = opts.registry
  }

  /**
   * Initializes the runtime once per instance and emits a global `nura:started` event.
   */
  start(): void {
    if (this.#started) return

    this.#started = true
    document.dispatchEvent(new CustomEvent('nura:started'))
  }

  /**
   * Executes an action through the registry dispatcher, respecting configured
   * permissions and confirmation policies.
   */
  async act(action: NAction): Promise<NResult> {
    const { config, permissions, actions } = this.#registry
    const actor: NActor | undefined = config.actor?.()
    const scope = resolveScope(action, config)

    const actionType = getActionType(action)
    const rule = pickRule(permissions, scope, actionType)

    let allowed = true
    let reason: string | undefined

    let policy: ReturnType<typeof decidePolicy> = 'allow'

    if (rule) {
      if (!hasRole(rule, actor)) {
        allowed = false
        reason = 'forbidden:role'
      } else {
        policy = decidePolicy(rule)
        if (policy === 'deny') {
          allowed = false
          reason = 'forbidden:policy'
        }
      }
    }

    if (
      allowed &&
      (policy === 'confirm' || ('type' in action && action.meta?.requireConfirm))
    ) {
      const confirmFn = config.confirm ?? defaultConfirm
      const ok = await Promise.resolve(confirmFn({ action, scope, rule }))
      if (!ok) {
        allowed = false
        reason = 'cancelled:confirm'
      }
    }

    if (!allowed) {
      this.#registry.audit?.log?.({
        action,
        actor,
        scope,
        allowed,
        reason,
        timestamp: Date.now(),
      })
      return { ok: false, message: reason ?? 'forbidden' }
    }

    const res = await actions.dispatch(action)

    this.#registry.audit?.log?.({
      action,
      actor,
      scope,
      allowed: true,
      timestamp: Date.now(),
    })

    return res
  }
}

export type { NActionMeta, NActionSpecMeta } from './types/action'
export * from './types'
export { createRegistry } from './create-registry'
export { createActionCatalog, defineActionSpec } from './actions'
export { createI18n } from './i18n'
export { createLexicon } from './lexicon'
export { createTelemetry } from './telemetry'
export * from './entities'
export * from './wake'
export * from './context'
export * from './locale'
export * from './numerals'
export * from './synonyms'
export {
  collectCommandVariants,
  collectEntityVariants,
  collectWakeVariants,
} from './registry'
export type {
  NI18n,
  NI18nConfig,
  NLocale,
  NNamespaces,
  NMessages,
  NBundle,
} from './i18n'
export type { NLexicon, NCanonical, NSense } from './lexicon'
export type {
  NTelemetry,
  NTelemetryEvent,
  NTelemetryHandler,
  NTelemetryPayload,
  NTelemetryWildcardHandler,
} from './telemetry'
export { seedLexicon } from './seeds/lexicon'

function resolveScope(action: NAction, config: NRegistry['config']): string | undefined {
  const resolved = config.resolveScope?.(action)
  if (resolved) return resolved
  if ('scope' in action) return action.scope
  return undefined
}

function getActionType(action: NAction): string | undefined {
  if ('type' in action) return action.type
  if ('verb' in action) return action.verb
  return undefined
}

function defaultConfirm(_: {
  action: NAction
  scope?: string
  rule?: NPermissionRule
}): boolean {
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm('Confirm action?')
  }
  return true
}
