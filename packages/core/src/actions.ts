import type { ModernNAction, NAction, NActionCatalog, NActionSpec, NResult } from './types'
export const defineActionSpec = (spec: NActionSpec): NActionSpec => spec
export function createActionCatalog(
  routes: Record<string, (payload?: Record<string, unknown>) => Promise<NResult> | NResult> = {},
  initial: NActionSpec[] = [],
): NActionCatalog {
  const specs = [...initial]
  return {
    async dispatch(action: NAction) {
      if (!('type' in action)) return { ok: false, message: 'No handler for legacy action' }
      const modern = action as ModernNAction
      const handler = routes[`${modern.type}::${modern.target ?? 'default'}`]
      return handler ? handler(modern.payload) : { ok: false, message: `No handler for ${modern.type}::${modern.target ?? 'default'}` }
    },
    listSpecs: () => [...specs],
    register(spec) { specs.push(spec) },
  }
}
