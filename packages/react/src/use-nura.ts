import { useNuraContext } from "./context"
import type { NuraRegistry } from "@nura-js/core"
import type { DOMIndexer } from "@nura-js/dom"

export interface UseNuraReturn {
  registry: NuraRegistry
  indexer: DOMIndexer
}

export function useNura(): UseNuraReturn {
  const { registry, indexer } = useNuraContext()
  return { registry, indexer }
}
