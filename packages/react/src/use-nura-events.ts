"use client"

import { useEffect } from "react"
import { useNuraContext } from "./context"
import type { NuraEventType, NuraEventListener } from "@nura/core"

export function useNuraEvent(type: NuraEventType, listener: NuraEventListener) {
  const { registry } = useNuraContext()

  useEffect(() => {
    const unsubscribe = registry.on(type, listener)
    return unsubscribe
  }, [registry, type, listener])
}

export function useNuraEvents(listeners: Partial<Record<NuraEventType, NuraEventListener>>) {
  const { registry } = useNuraContext()

  useEffect(() => {
    const unsubscribers = Object.entries(listeners).map(([type, listener]) => {
      if (listener) {
        return registry.on(type as NuraEventType, listener)
      }
      return () => {}
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [registry, listeners])
}
