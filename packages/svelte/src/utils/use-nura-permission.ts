import { onMount, onDestroy } from "svelte"
import { writable } from "svelte/store"
import { getNuraContext } from "../context"
import type { NuraVerb, NuraScope, NuraPermission } from "@nura/core"

export interface UseNuraPermissionOptions {
  scope: NuraScope
  verbs: NuraVerb[]
  condition?: () => boolean | Promise<boolean>
}

export function useNuraPermission(options: UseNuraPermissionOptions) {
  const { registry } = getNuraContext()

  const permission: NuraPermission = {
    scope: options.scope,
    verbs: options.verbs,
    condition: options.condition,
  }

  onMount(() => {
    registry.addPermission(permission)
  })

  onDestroy(() => {
    registry.removePermission(options.scope)
  })
}

export function useHasPermission(verb: NuraVerb, scope: NuraScope) {
  const { registry } = getNuraContext()
  const hasPermission = writable(true)

  onMount(async () => {
    const result = await registry.hasPermission(verb, scope)
    hasPermission.set(result)
  })

  return hasPermission
}
