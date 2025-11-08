import { writable, type Readable } from "svelte/store"
import { getNuraContext } from "./context"
import type { NuraElement, NuraScope, NuraVerb } from "@nura/core"

type ActionSpecList = ReturnType<
  ReturnType<typeof getNuraContext>["registry"]["actions"]["listSpecs"]
>

export function createNuraStore() {
  const { registry, indexer } = getNuraContext()

  const listSpecs = () => registry.actions.listSpecs()
  const actions = writable<ActionSpecList>([])
  const elements = writable<NuraElement[]>([])

  const updateActions = () => {
    actions.set(listSpecs())
  }

  registry.on("action:registered", updateActions)

  registry.on("action:unregistered", updateActions)

  const updateElements = () => {
    elements.set(indexer.getAll())
  }

  updateActions()
  updateElements()

  return {
    actions: { subscribe: actions.subscribe },
    elements: { subscribe: elements.subscribe },
    registry,
    indexer,
  }
}

export function createActionStore(scope?: NuraScope): Readable<ActionSpecList> {
  const { registry } = getNuraContext()
  const getSpecs = () => registry.actions.listSpecs()
  const store = writable<ActionSpecList>([])

  const update = () => {
    const specs = getSpecs()
    store.set(scope ? specs.filter((spec) => spec.scope === scope) : specs)
  }

  registry.on("action:registered", update)
  registry.on("action:unregistered", update)

  update()

  return { subscribe: store.subscribe }
}

export function createPermissionStore(verb: NuraVerb, scope: NuraScope): Readable<boolean> {
  const { registry } = getNuraContext()
  const store = writable<boolean>(true)

  const check = async () => {
    const hasPermission = await registry.hasPermission(verb, scope)
    store.set(hasPermission)
  }

  check()

  return { subscribe: store.subscribe }
}
