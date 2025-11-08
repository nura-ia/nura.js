import { createActionCatalog as createCoreActionCatalog } from './actions'
import { createI18n, type NI18n, type NI18nConfig } from './i18n'
import { createLexicon, type NLexicon } from './lexicon'
import { createTelemetry, type NTelemetry } from './telemetry'
import type {
  LegacyNuraAction,
  NAction,
  NActionCatalog,
  NActionSpec,
  NActionType,
  NConfig,
  NPermissions,
  NRegistry,
  NResult,
  NAudit,
  NPermissionRule,
  NuraEvent,
  NuraEventListener,
  NuraEventType,
  NuraPermission,
  NuraVerb,
  NuraScope,
} from './types'

export type CreateRegistryOptions = {
  config?: Partial<NConfig>
  permissions?: Partial<NPermissions>
  actionCatalog?: Partial<NActionCatalog>
  audit?: NAudit
  routes?: Record<string, (payload?: Record<string, unknown>) => Promise<NResult> | NResult>
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
  resolveScope: config?.resolveScope,
  confirm: config?.confirm,
  actor: config?.actor,
})

const createDefaultPermissions = (
  permissions: Partial<NPermissions> | undefined,
): NPermissions => ({
  scopes: permissions?.scopes ?? {},
})

const defaultDispatch = async (): Promise<NResult> => ({
  ok: false,
  message: 'No dispatcher configured',
})

const normalizeOptions = (input: CreateRegistryInput): CreateRegistryOptions => {
  if (!input) return {}
  if (isConfig(input)) {
    return { config: input }
  }
  return input
}

const createActionKey = (verb: NActionType, scope: NuraScope): string => `${scope}::${verb}`

const createListenerMap = () => new Map<NuraEventType, Set<NuraEventListener>>()

const emitToListeners = (
  listeners: Map<NuraEventType, Set<NuraEventListener>>,
  type: NuraEventType,
  event: NuraEvent,
): void => {
  const callbacks = listeners.get(type)
  if (!callbacks) return

  callbacks.forEach((listener) => listener(event))
}

const addListener = (
  listeners: Map<NuraEventType, Set<NuraEventListener>>,
  type: NuraEventType,
  listener: NuraEventListener,
): (() => void) => {
  const existing = listeners.get(type) ?? new Set<NuraEventListener>()
  existing.add(listener)
  listeners.set(type, existing)

  return () => {
    existing.delete(listener)
    if (existing.size === 0) {
      listeners.delete(type)
    }
  }
}

const runRegisteredAction = (
  store: Map<string, LegacyNuraAction>,
): (verb: NActionType, scope: NuraScope, params?: Record<string, unknown>) => Promise<NResult> => {
  return async (verb, scope, params) => {
    const action = store.get(createActionKey(verb, scope))

    if (!action) {
      return { ok: false, message: `No action registered for ${scope}:${verb}` }
    }

    try {
      await action.handler(params)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { ok: false, message }
    }
  }
}

export const createRegistry = (input: CreateRegistryInput = undefined): NRegistry => {
  const options = normalizeOptions(input)
  const actionStore = new Map<string, LegacyNuraAction>()
  const listeners = createListenerMap()
  const permissionStore = new Map<NuraScope, NuraPermission>()
  const permissionState = createDefaultPermissions(options.permissions)
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
    const event: NuraEvent = { type, data, timestamp: Date.now() }
    emitToListeners(listeners, type, event)
  }

  for (const [scope, verbs] of Object.entries(permissionState.scopes)) {
    permissionStore.set(scope, {
      scope,
      verbs: Object.keys(verbs) as NuraVerb[],
      roles: undefined,
      confirm: Object.values(verbs).some(
        (rule) => rule.confirm || rule.policy === 'confirm',
      ),
      policy: undefined,
    })
  }

  const executeRegisteredAction = runRegisteredAction(actionStore)

  const executeAction = async (
    verb: NActionType,
    scope: NuraScope,
    params?: Record<string, unknown>,
  ): Promise<NResult> => {
    const result = await executeRegisteredAction(verb, scope, params)
    emit('action:executed', { verb, scope, params, result })
    if (!result.ok) {
      emit('action:error', { verb, scope, params, result })
    }
    return result
  }

  const baseCatalog = createCoreActionCatalog(options.routes, options.specs)

  const actions: NActionCatalog = {
    dispatch:
      options.actionCatalog?.dispatch ??
      (async (action: NAction) => {
        if ('verb' in action && action.scope) {
          return executeAction(action.verb, action.scope, action.metadata)
        }

        if ('type' in action && action.type) {
          const result = await baseCatalog.dispatch(action)
          if (!result.ok && result.message?.startsWith('No handler')) {
            return executeAction(action.type, action.target ?? 'default', action.payload)
          }
          return result
        }

        emit('action:error', { action, reason: 'unhandled' })
        return defaultDispatch()
      }),
    listSpecs:
      options.actionCatalog?.listSpecs ?? (() => baseCatalog.listSpecs()),
    register:
      options.actionCatalog?.register ?? ((spec: NActionSpec) => {
        baseCatalog.register(spec)
      }),
  }

  return {
    actions,
    permissions: permissionState,
    config,
    audit: options.audit,
    i18n,
    lexicon,
    telemetry,
    registerAction(action: LegacyNuraAction) {
      actionStore.set(createActionKey(action.verb, action.scope), action)
      emit('action:registered', { action })
    },
    unregisterAction(verb: NActionType, scope: NuraScope) {
      actionStore.delete(createActionKey(verb, scope))
      emit('action:unregistered', { verb, scope })
    },
    executeAction,
    on(type: NuraEventType, listener: NuraEventListener) {
      return addListener(listeners, type, listener)
    },
    addPermission(permission: NuraPermission) {
      permissionStore.set(permission.scope, permission)
      permissionState.scopes[permission.scope] = permission.verbs.reduce<
        Record<string, NPermissionRule>
      >((acc, verb) => {
        acc[verb] = {
          roles: permission.roles,
          confirm: permission.confirm,
          policy: permission.policy,
        }
        return acc
      }, {})
      emit('permission:added', { permission })
    },
    removePermission(scope: NuraScope) {
      permissionStore.delete(scope)
      delete permissionState.scopes[scope]
      emit('permission:removed', { scope })
    },
    async hasPermission(verb: NActionType, scope: NuraScope) {
      const record = permissionStore.get(scope)
      if (!record || !record.verbs.includes(verb)) {
        emit('permission:denied', { verb, scope })
        return false
      }

      if (record.condition) {
        const result = await record.condition()
        if (!result) {
          emit('permission:denied', { verb, scope })
        }
        return result
      }

      return true
    },
  }
}
