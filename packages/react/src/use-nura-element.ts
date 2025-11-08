"use client"

import { useRef, useEffect } from "react"
import type { NuraVerb, NuraScope } from "@nura/core"

export interface UseNuraElementOptions {
  scope: NuraScope
  listen?: NuraVerb[]
  act?: NuraVerb[]
  meta?: Record<string, any>
}

export function useNuraElement<T extends HTMLElement = HTMLElement>(options: UseNuraElementOptions) {
  const { scope, listen = [], act = [], meta } = options
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return

    const element = ref.current

    element.setAttribute("data-nu-scope", scope)

    if (listen.length > 0) {
      element.setAttribute("data-nu-listen", listen.join(" "))
    } else {
      element.removeAttribute("data-nu-listen")
    }

    if (act.length > 0) {
      element.setAttribute("data-nu-act", act.join(" "))
    } else {
      element.removeAttribute("data-nu-act")
    }

    if (meta && Object.keys(meta).length > 0) {
      element.setAttribute("data-nu-meta", JSON.stringify(meta))
    } else {
      element.removeAttribute("data-nu-meta")
    }
  }, [scope, listen, act, meta])

  return ref
}
