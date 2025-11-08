"use client"

import { useEffect, useCallback } from "react"
import { useNuraContext } from "./context"
import type { NuraAction, NuraVerb, NuraScope } from "@nura/core"

export interface UseNuraActionOptions {
  verb: NuraVerb
  scope: NuraScope
  handler: (params?: Record<string, any>) => void | Promise<void>
  description?: string
  metadata?: Record<string, any>
  enabled?: boolean
}

export function useNuraAction(options: UseNuraActionOptions) {
  const { registry } = useNuraContext()
  const { verb, scope, handler, description, metadata, enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const action: NuraAction = {
      verb,
      scope,
      handler,
      description,
      metadata,
    }

    registry.registerAction(action)

    return () => {
      registry.unregisterAction(verb, scope)
    }
  }, [registry, verb, scope, handler, description, metadata, enabled])

  const execute = useCallback(
    async (params?: Record<string, any>) => {
      return registry.executeAction(verb, scope, params)
    },
    [registry, verb, scope],
  )

  return { execute }
}
