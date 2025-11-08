import type { Action } from "svelte/action"
import type { NuraVerb, NuraScope } from "@nura/core"

export interface NuraActionParams {
  scope: NuraScope
  listen?: NuraVerb[]
  act?: NuraVerb[]
  meta?: Record<string, any>
}

export const nura: Action<HTMLElement, NuraActionParams> = (node, params) => {
  const updateAttributes = (params: NuraActionParams) => {
    const { scope, listen = [], act = [], meta } = params

    node.setAttribute("data-nu-scope", scope)

    if (listen.length > 0) {
      node.setAttribute("data-nu-listen", listen.join(" "))
    } else {
      node.removeAttribute("data-nu-listen")
    }

    if (act.length > 0) {
      node.setAttribute("data-nu-act", act.join(" "))
    } else {
      node.removeAttribute("data-nu-act")
    }

    if (meta && Object.keys(meta).length > 0) {
      node.setAttribute("data-nu-meta", JSON.stringify(meta))
    } else {
      node.removeAttribute("data-nu-meta")
    }
  }

  updateAttributes(params)

  return {
    update(newParams: NuraActionParams) {
      updateAttributes(newParams)
    },
    destroy() {
      node.removeAttribute("data-nu-scope")
      node.removeAttribute("data-nu-listen")
      node.removeAttribute("data-nu-act")
      node.removeAttribute("data-nu-meta")
    },
  }
}
