"use client"

import { useEffect, useState } from "react"
import { useNuraContext } from "./context"
import type { NuraVerb, NuraScope, NuraPermission } from "@nura/core"

export interface UseNuraPermissionOptions {
  scope: NuraScope
  verbs: NuraVerb[]
  condition?: () => boolean | Promise<boolean>
}

export function useNuraPermission(options: UseNuraPermissionOptions) {
  const { registry } = useNuraContext()
  const { scope, verbs, condition } = options

  useEffect(() => {
    const permission: NuraPermission = {
      scope,
      verbs,
      condition,
    }

    registry.addPermission(permission)

    return () => {
      registry.removePermission(scope)
    }
  }, [registry, scope, verbs, condition])
}

export function useHasPermission(verb: NuraVerb, scope: NuraScope): boolean {
  const { registry } = useNuraContext()
  const [hasPermission, setHasPermission] = useState(true)

  useEffect(() => {
    let mounted = true

    registry.hasPermission(verb, scope).then((result) => {
      if (mounted) {
        setHasPermission(result)
      }
    })

    return () => {
      mounted = false
    }
  }, [registry, verb, scope])

  return hasPermission
}
