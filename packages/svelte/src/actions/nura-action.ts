import type { Action } from "svelte/action"
import { getNuraContext } from "../context"
import type { NuraAction, NuraVerb, NuraScope } from "@nura/core"

export interface NuraActionRegistrationParams {
  verb: NuraVerb
  scope: NuraScope
  handler: (params?: Record<string, any>) => void | Promise<void>
  description?: string
  metadata?: Record<string, any>
}

export const nuraAction: Action<HTMLElement, NuraActionRegistrationParams> = (
  _node,
  params,
) => {
  const { registry } = getNuraContext()

  const register = (params: NuraActionRegistrationParams) => {
    const action: NuraAction = {
      verb: params.verb,
      scope: params.scope,
      handler: params.handler,
      description: params.description,
      metadata: params.metadata,
    }

    registry.registerAction(action)
  }

  const unregister = (params: NuraActionRegistrationParams) => {
    registry.unregisterAction(params.verb, params.scope)
  }

  register(params)

  return {
    update(newParams: NuraActionRegistrationParams) {
      unregister(params)
      register(newParams)
    },
    destroy() {
      unregister(params)
    },
  }
}
