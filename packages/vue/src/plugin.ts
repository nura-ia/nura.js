import { inject, type App, type InjectionKey } from "vue"
import { createRegistry, type NuraRegistry, type NuraConfig } from "@nura/core"
import { DOMIndexer } from "@nura/dom"

export interface NuraVueOptions {
  config?: NuraConfig
  registry?: NuraRegistry
}

export interface NuraInstance {
  registry: NuraRegistry
  indexer: DOMIndexer
}

export const NuraSymbol: InjectionKey<NuraInstance> = Symbol("nura")

export const NuraPlugin = {
  install(app: App, options: NuraVueOptions = {}) {
    const registry = options.registry || createRegistry(options.config)
    const indexer = new DOMIndexer({
      autoScan: true,
      observeChanges: true,
    })

    const nuraInstance: NuraInstance = {
      registry,
      indexer,
    }

    app.provide(NuraSymbol, nuraInstance)

    app.config.globalProperties.$nura = nuraInstance

    app.mixin({
      beforeUnmount() {
        if (this === this.$root) {
          indexer.destroy()
        }
      },
    })
  },
}

export function useNuraInstance(): NuraInstance {
  const nura = inject(NuraSymbol)
  if (!nura) {
    throw new Error("Nura plugin not installed. Use app.use(NuraPlugin)")
  }
  return nura
}
