import { onMounted, onBeforeUnmount } from "vue"
import { useNuraInstance } from "../plugin"
import type { NuraEventType, NuraEventListener } from "@nura/core"

export function useNuraEvent(type: NuraEventType, listener: NuraEventListener) {
  const { registry } = useNuraInstance()
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = registry.on(type, listener)
  })

  onBeforeUnmount(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })
}

export function useNuraEvents(listeners: Partial<Record<NuraEventType, NuraEventListener>>) {
  const { registry } = useNuraInstance()
  const unsubscribers: Array<() => void> = []

  onMounted(() => {
    Object.entries(listeners).forEach(([type, listener]) => {
      if (listener) {
        const unsubscribe = registry.on(type as NuraEventType, listener)
        unsubscribers.push(unsubscribe)
      }
    })
  })

  onBeforeUnmount(() => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  })
}
