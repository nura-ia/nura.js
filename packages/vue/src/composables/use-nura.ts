import { useNuraInstance } from "../plugin"
import type { NuraRegistry } from "@nura/core"
import type { DOMIndexer } from "@nura/dom"

export interface UseNuraReturn {
  registry: NuraRegistry
  indexer: DOMIndexer
}

export function useNura(): UseNuraReturn {
  const { registry, indexer } = useNuraInstance()
  return { registry, indexer }
}
