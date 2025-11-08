import type { NuraElement, NuraVerb, NuraScope } from "@nura/core"
import { parseVerbList } from "./verbs"

export interface ScanResult {
  elements: NuraElement[]
  scopes: Set<NuraScope>
  verbs: Set<NuraVerb>
  stats: {
    total: number
    byScope: Record<NuraScope, number>
    byVerb: Partial<Record<NuraVerb, number>>
  }
}

export function scanDOM(root: HTMLElement = document.body): ScanResult {
  const elements: NuraElement[] = []
  const scopes = new Set<NuraScope>()
  const verbs = new Set<NuraVerb>()
  const byScope: Record<NuraScope, number> = {}
  const byVerb: Partial<Record<NuraVerb, number>> = {}

  const nodeList = root.querySelectorAll("[data-nu-scope]")

  nodeList.forEach((node) => {
    const element = node as HTMLElement
    const scope = element.getAttribute("data-nu-scope")
    if (!scope) return

    const listenAttr = element.getAttribute("data-nu-listen")
    const actAttr = element.getAttribute("data-nu-act")

    const elementVerbs = [
      ...parseVerbList(listenAttr),
      ...parseVerbList(actAttr),
    ]

    if (elementVerbs.length === 0) return

    let metadata: Record<string, any> = {}
    const metaAttr = element.getAttribute("data-nu-meta")
    if (metaAttr) {
      try {
        metadata = JSON.parse(metaAttr)
      } catch (e) {
        console.warn("[Nura] Failed to parse metadata:", metaAttr)
      }
    }

    const nuraElement: NuraElement = {
      id: element.id || `nu-${scope}-${elements.length}`,
      scope,
      verbs: elementVerbs,
      element,
      metadata,
    }

    elements.push(nuraElement)
    scopes.add(scope)

    elementVerbs.forEach((verb) => {
      verbs.add(verb)
      byVerb[verb] = (byVerb[verb] || 0) + 1
    })

    byScope[scope] = (byScope[scope] || 0) + 1
  })

  return {
    elements,
    scopes,
    verbs,
    stats: {
      total: elements.length,
      byScope,
      byVerb,
    },
  }
}

export function findElementsByScope(scope: NuraScope, root: HTMLElement = document.body): HTMLElement[] {
  return Array.from(root.querySelectorAll(`[data-nu-scope="${scope}"]`))
}

export function findElementsByVerb(verb: NuraVerb, root: HTMLElement = document.body): HTMLElement[] {
  const elements: HTMLElement[] = []
  const nodeList = root.querySelectorAll("[data-nu-listen], [data-nu-act]")

  nodeList.forEach((node) => {
    const element = node as HTMLElement
    const listenAttr = element.getAttribute("data-nu-listen")
    const actAttr = element.getAttribute("data-nu-act")

    const verbs = [
      ...parseVerbList(listenAttr),
      ...parseVerbList(actAttr),
    ]

    if (verbs.includes(verb)) {
      elements.push(element)
    }
  })

  return elements
}
