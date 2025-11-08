import { getContext, setContext } from "svelte"
import { createRegistry, type NuraRegistry, type NuraConfig } from "@nura/core"
import { DOMIndexer } from "@nura/dom"

export interface NuraContext {
  registry: NuraRegistry
  indexer: DOMIndexer
}

const NURA_CONTEXT_KEY = Symbol("nura")

export function initNura(config?: NuraConfig): NuraContext {
  const registry = createRegistry(config)
  const indexer = new DOMIndexer({
    autoScan: true,
    observeChanges: true,
  })

  const context: NuraContext = {
    registry,
    indexer,
  }

  setContext(NURA_CONTEXT_KEY, context)

  return context
}

export function getNuraContext(): NuraContext {
  const context = getContext<NuraContext>(NURA_CONTEXT_KEY)
  if (!context) {
    throw new Error("Nura context not found. Did you call initNura() in a parent component?")
  }
  return context
}
