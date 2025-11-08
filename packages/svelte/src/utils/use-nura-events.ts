import { onMount, onDestroy } from "svelte"
import { getNuraContext } from "../context"
import type { NuraEventType, NuraEventListener } from "@nura/core"

export function useNuraEvent(type: NuraEventType, listener: NuraEventListener) {
  const { registry } = getNuraContext()
  let unsubscribe: (() => void) | null = null

  onMount(() => {
    unsubscribe = registry.on(type, listener)
  })

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })
}

export function useNuraEvents(listeners: Partial<Record<NuraEventType, NuraEventListener>>) {
  const { registry } = getNuraContext()
  const unsubscribers: Array<() => void> = []

  onMount(() => {
    Object.entries(listeners).forEach(([type, listener]) => {
      if (listener) {
        const unsubscribe = registry.on(type as NuraEventType, listener)
        unsubscribers.push(unsubscribe)
      }
    })
  })

  onDestroy(() => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  })
}
