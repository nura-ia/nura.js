"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createRegistry, type NuraRegistry, type NuraConfig } from "@nura/core"
import { DOMIndexer } from "@nura/dom"

interface NuraContextValue {
  registry: NuraRegistry
  indexer: DOMIndexer
}

const NuraContext = createContext<NuraContextValue | null>(null)

export interface NuraProviderProps {
  children: ReactNode
  config?: Partial<NuraConfig>
  registry?: NuraRegistry
}

export function NuraProvider({ children, config, registry: externalRegistry }: NuraProviderProps) {
  const [contextValue] = useState<NuraContextValue>(() => {
    const registry = externalRegistry || createRegistry(config ? { config } : undefined)
    const indexer = new DOMIndexer({
      autoScan: true,
      observeChanges: true,
    })

    return { registry, indexer }
  })

  useEffect(() => {
    return () => {
      contextValue.indexer.destroy()
    }
  }, [contextValue])

  return <NuraContext.Provider value={contextValue}>{children}</NuraContext.Provider>
}

export function useNuraContext(): NuraContextValue {
  const context = useContext(NuraContext)
  if (!context) {
    throw new Error("useNuraContext must be used within a NuraProvider")
  }
  return context
}
