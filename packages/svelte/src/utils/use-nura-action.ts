import { onMount, onDestroy } from "svelte"
import { getNuraContext } from "../context"
import type { NuraAction, NuraVerb, NuraScope } from "@nura/core"

export interface UseNuraActionOptions {
  verb: NuraVerb
  scope: NuraScope
  handler: (params?: Record<string, any>) => void | Promise<void>
  description?: string
  metadata?: Record<string, any>
}

export function useNuraAction(options: UseNuraActionOptions) {
  const { registry } = getNuraContext()

  const action: NuraAction = {
    verb: options.verb,
    scope: options.scope,
    handler: options.handler,
    description: options.description,
    metadata: options.metadata,
  }

  onMount(() => {
    registry.registerAction(action)
  })

  onDestroy(() => {
    registry.unregisterAction(options.verb, options.scope)
  })

  const execute = async (params?: Record<string, any>) => {
    return registry.executeAction(options.verb, options.scope, params)
  }

  return { execute }
}
