import { ref, onMounted, watch, toRef, unref, type Ref } from "vue"
import type { NuraVerb, NuraScope } from "@nura/core"

export interface UseNuraElementOptions {
  scope: NuraScope | Ref<NuraScope>
  listen?: NuraVerb[] | Ref<NuraVerb[]>
  act?: NuraVerb[] | Ref<NuraVerb[]>
  meta?: Record<string, any> | Ref<Record<string, any>>
}

export function useNuraElement<T extends HTMLElement = HTMLElement>(
  options: UseNuraElementOptions,
): Ref<T | null> {
  const elementRef = ref<T | null>(null)

  const scopeRef = toRef(options, "scope")
  const listenRef = toRef(options, "listen") as Ref<NuraVerb[] | undefined>
  const actRef = toRef(options, "act") as Ref<NuraVerb[] | undefined>
  const metaRef = toRef(options, "meta") as Ref<Record<string, any> | undefined>

  const updateAttributes = () => {
    if (!elementRef.value) return

    const element = elementRef.value

    element.setAttribute("data-nu-scope", scopeRef.value)

    const listen = unref(listenRef) ?? []
    if (listen.length > 0) {
      element.setAttribute("data-nu-listen", listen.join(" "))
    } else {
      element.removeAttribute("data-nu-listen")
    }

    const act = unref(actRef) ?? []
    if (act.length > 0) {
      element.setAttribute("data-nu-act", act.join(" "))
    } else {
      element.removeAttribute("data-nu-act")
    }

    const meta = unref(metaRef)
    if (meta && Object.keys(meta).length > 0) {
      element.setAttribute("data-nu-meta", JSON.stringify(meta))
    } else {
      element.removeAttribute("data-nu-meta")
    }
  }

  onMounted(() => {
    updateAttributes()
  })

  watch([scopeRef, listenRef, actRef, metaRef], () => {
    updateAttributes()
  })

  return elementRef as Ref<T | null>
}
