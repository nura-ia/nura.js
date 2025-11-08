import type {
  ModernNAction,
  NAction,
  NActionCatalog,
  NActionSpec,
  NResult,
} from './types'

type ActionPayload = Record<string, unknown> | undefined

type ActionHandler = (payload: ActionPayload) => Promise<NResult> | NResult

type HandlerMapInput = Record<string, unknown>

export function createActionCatalog(
  initial?: HandlerMapInput,
  specs?: NActionSpec[],
): NActionCatalog {
  const handlers = new Map<string, ActionHandler>()
  const _specs: NActionSpec[] = Array.isArray(specs) ? [...specs] : []

  if (typeof initial === 'object' && initial !== null) {
    for (const [key, maybeHandler] of Object.entries(initial)) {
      if (typeof maybeHandler === 'function') {
        handlers.set(key, maybeHandler as ActionHandler)
      }
    }
  }

  function isModernAction(action: NAction): action is ModernNAction {
    return 'type' in action
  }

  function keyFor(action: NAction) {
    if (isModernAction(action)) {
      return `${action.type}::${action.target ?? ''}`
    }
    return `${action.verb}::${action.scope ?? ''}`
  }

  return {
    async dispatch(action: NAction) {
      const k = keyFor(action)
      const fn = handlers.get(k) ?? handlers.get(isModernAction(action) ? action.type : action.verb)
      if (!fn) return { ok: false, message: `No handler for ${k}` }
      const input = isModernAction(action) ? action.payload : action.metadata
      return await fn(input)
    },
    listSpecs() {
      return [..._specs]
    },
    register(spec: NActionSpec) {
      _specs.push(spec)
    },
  }
}

export function defineActionSpec(spec: NActionSpec): NActionSpec {
  return spec
}

export type { NActionCatalog, NActionSpec } from './types'
