import { createActionCatalog as createCoreActionCatalog } from './actions'
import { createI18n, type NI18n, type NI18nConfig } from './i18n'
import { createLexicon, type NLexicon } from './lexicon'
import { evaluatePermission } from './permissions'
import { executeNuraAction } from './runtime'
import { createTelemetry, type NTelemetry } from './telemetry'
import type {
  LegacyNuraAction,
  NAction,
  NActionCatalog,
  NActionSpec,
  NActionType,
  NAudit,
  NConfig,
  NPermissionRule,
  NPermissions,
  NRegistry,
  NResult,
  NuraEvent,
  NuraEventListener,
  NuraEventType,
  NuraPermission,
  NuraScope,
} from './types'

export type CreateRegistryOptions = {
  config?: Partial<NConfig>
  permissions?: Partial<NPermissions>
  actionCatalog?: Partial<NActionCatalog>
  audit?: NAudit
  routes?: Record<
    string,
    (payload?: Record<string, unknown>) => Promise<NResult> | NResult
  >
  specs?: NActionSpec[]
  i18n?: Partial<NI18nConfig>
  seedLexicon?: Array<{ locale: string; terms: Record<string, string> }>
}

export type CreateRegistryInput = NConfig | CreateRegistryOptions | undefined

const isConfig = (input: CreateRegistryInput): input is NConfig =>
  typeof input === 'object' && input !== null && 'app' in input

const createDefaultConfig = (config: Partial<NConfig> | undefined): NConfig => ({
  app: {
    id: config?.app?.id ?? 'nura-app',
    locale: config?.app?.locale,
  },
  capabilities: config?.capabilities,
  debug: config?.debug,
  defaultPolicy: config?.defaultPolicy,
  resolveScope: config?.resolveScope,
  confirm: config?.confirm,
  actor: config?.actor,
})

const createDefaultPermissions = (
  permissions: Partial<NPermissions> | undefined,
): NPermissions => ({
  scopes: permissions?.scopes ?? {},
})

const normalizeOptions = (input: CreateRegistryInput): CreateRegistryOptions => {
  if (!input) return {}
  return isConfig(input) ? { config: input } : input
}

const actionKey = (verb: NActionType, scope: NuraScope): string =>
  `${scope}::${verb}`

const emitToListeners = (
  listeners: Map<NuraEventType, Set<NuraEventListener>>,
  type: NuraEventType,
  event: NuraEvent,
): void => {
  listeners.get(type)?.forEach((listener) => {
    try {
      listener(event)
    } catch {
      // Event listeners are observers and must not break registry operations.
    }
  })
}

const addListener = (
  listeners: Map<NuraEventType, Set<NuraEventListener>>,
  type: NuraEventType,
  listener: NuraEventListener,
): (() => void) => {
  const set = listeners.get(type) ?? new Set<NuraEventListener>()
  set.add(listener)
  listeners.set(type, set)
  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(type)
  }
}

export const createRegistry = (
  input: CreateRegistryInput = undefined,
): NRegistry => {
  const options = normalizeOptions(input)
  const registeredActions = new Map<string, LegacyNuraAction>()
  const listeners = new Map<NuraEventType, Set<NuraEventListener>>()
  const permissions = createDefaultPermissions(options.permissions)
  const config = createDefaultConfig(options.config)
  const telemetry: NTelemetry = createTelemetry()

  const i18nDefaultLocale =
    options.i18n?.defaultLocale ?? config.app.locale ?? 'es-CR'
  const i18n: NI18n = createI18n({
    defaultLocale: i18nDefaultLocale,
    fallbackLocales: options.i18n?.fallbackLocales ?? ['es', 'en'],
    bundles: options.i18n?.bundles ?? {},
    detect: options.i18n?.detect,
    telemetry,
  })

  const lexicon: NLexicon = createLexicon(telemetry)
  for (const seed of options.seedLexicon ?? []) {
    lexicon.bulk(seed.locale, seed.terms)
  }

  const emit = (type: NuraEventType, data: unknown): void => {
    emitToListeners(listeners, type, { type, data, timestamp: Date.now() })
  }

  const executeRegisteredAction = async (
    verb: NActionType,
    scope: NuraScope,
    params?: Record<string, unknown>,
  ): Promise<NResult> => {
    const action = registeredActions.get(actionKey(verb, scope))
    if (!action) {
      return {
        ok: false,
        message: `No action registered for ${scope}:${verb}`,
      }
    }
    await action.handler(params)
    return { ok: true }
  }

  const baseCatalog = createCoreActionCatalog(options.routes, options.specs)

  const defaultDispatch = async (action: NAction): Promise<NResult> => {
    if ('verb' in action) {
      return executeRegisteredAction(action.verb, action.scope, action.metadata)
    }

    const result = await baseCatalog.dispatch(action)
    if (!result.ok && result.message?.startsWith('No handler')) {
      return executeRegisteredAction(
        action.type,
        action.target ?? 'default',
        action.payload,
      )
    }
    return result
  }

  const actions: NActionCatalog = {
    dispatch: options.actionCatalog?.dispatch ?? defaultDispatch,
    listSpecs: options.actionCatalog?.listSpecs ?? (() => baseCatalog.listSpecs()),
    register:
      options.actionCatalog?.register ??
      ((spec: NActionSpec) => {
        baseCatalog.register(spec)
      }),
  }

  let registry: NRegistry
  registry = {
    actions,
    permissions,
    config,
    audit: options.audit,
    i18n,
    lexicon,
    telemetry,
    registerAction(action: LegacyNuraAction) {
      registeredActions.set(actionKey(action.verb, action.scope), action)
      emit('action:registered', { action })
    },
    unregisterAction(verb: NActionType, scope: NuraScope) {
      registeredActions.delete(actionKey(verb, scope))
      emit('action:unregistered', { verb, scope })
    },
    executeAction(
      verb: NActionType,
      scope: NuraScope,
      params?: Record<string, unknown>,
    ) {
      const stored = registeredActions.get(actionKey(verb, scope))
      const action: LegacyNuraAction =
        stored ?? {
          verb,
          scope,
          handler: () => undefined,
          metadata: params,
        }
      const actionWithParams: LegacyNuraAction = {
        ...action,
        metadata: { ...params, ...action.metadata },
      }
      return executeNuraAction(registry, actionWithParams, {
        dispatch: () => executeRegisteredAction(verb, scope, params),
      }).then((result) => {
        emit('action:executed', { verb, scope, params, result })
        if (!result.ok) emit('action:error', { verb, scope, params, result })
        return result
      })
    },
    on(type: NuraEventType, listener: NuraEventListener) {
      return addListener(listeners, type, listener)
    },
    addPermission(permission: NuraPermission) {
      permissions.scopes[permission.scope] = permission.verbs.reduce<
        Record<string, NPermissionRule>
      >((rules, verb) => {
        rules[verb] = {
          roles: permission.roles,
          confirm: permission.confirm,
          policy: permission.policy,
          condition: permission.condition
            ? () => permission.condition?.() ?? false
            : undefined,
        }
        return rules
      }, {})
      emit('permission:added', { permission })
    },
    removePermission(scope: NuraScope) {
      delete permissions.scopes[scope]
      emit('permission:removed', { scope })
    },
    async hasPermission(verb: NActionType, scope: NuraScope) {
      const decision = await evaluatePermission({
        permissions,
        scope,
        actionType: verb,
        actor: config.actor?.(),
        defaultPolicy: config.defaultPolicy ?? 'deny',
      })
      emit(decision.allowed ? 'permission:allowed' : 'permission:denied', {
        verb,
        scope,
        reason: decision.reason,
      })
      return decision.allowed
    },
  }

  return registry
}
