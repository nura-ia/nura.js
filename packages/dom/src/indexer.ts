import type { NuraElement, NuraVerb, NuraScope } from "@nura/core"
import { parseVerbList } from "./verbs"

export interface DOMIndexerOptions {
  root?: HTMLElement
  autoScan?: boolean
  observeChanges?: boolean
}

export class DOMIndexer {
  private elements: Map<string, NuraElement> = new Map()
  private observer: MutationObserver | null = null
  private root: HTMLElement
  private options: Required<DOMIndexerOptions>

  constructor(options: DOMIndexerOptions = {}) {
    this.root = options.root || document.body
    this.options = {
      root: this.root,
      autoScan: options.autoScan ?? true,
      observeChanges: options.observeChanges ?? true,
    }

    if (this.options.autoScan) {
      this.scan()
    }

    if (this.options.observeChanges) {
      this.startObserving()
    }
  }

  private generateId(element: HTMLElement): string {
    if (element.id) {
      return element.id
    }

    const scope = element.getAttribute("data-nu-scope") || "unknown"
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `nu-${scope}-${timestamp}-${random}`
  }

  private parseVerbs(verbsAttr: string | null): NuraVerb[] {
    if (!verbsAttr) return []
    return parseVerbList(verbsAttr)
  }

  private indexElement(element: HTMLElement): NuraElement | null {
    const scope = element.getAttribute("data-nu-scope")
    if (!scope) return null

    const listenAttr = element.getAttribute("data-nu-listen")
    const actAttr = element.getAttribute("data-nu-act")

    const verbs: NuraVerb[] = [...this.parseVerbs(listenAttr), ...this.parseVerbs(actAttr)]

    if (verbs.length === 0) return null

    const id = this.generateId(element)

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
      id,
      scope,
      verbs,
      element,
      metadata,
    }

    this.elements.set(id, nuraElement)
    return nuraElement
  }

  public scan(root?: HTMLElement): NuraElement[] {
    const scanRoot = root || this.root
    const indexed: NuraElement[] = []

    const elements = scanRoot.querySelectorAll("[data-nu-scope]")

    elements.forEach((element) => {
      const nuraElement = this.indexElement(element as HTMLElement)
      if (nuraElement) {
        indexed.push(nuraElement)
      }
    })

    return indexed
  }

  public findByScope(scope: NuraScope): NuraElement[] {
    return Array.from(this.elements.values()).filter((el) => el.scope === scope)
  }

  public findByVerb(verb: NuraVerb): NuraElement[] {
    return Array.from(this.elements.values()).filter((el) => el.verbs.includes(verb))
  }

  public findById(id: string): NuraElement | undefined {
    return this.elements.get(id)
  }

  public getAll(): NuraElement[] {
    return Array.from(this.elements.values())
  }

  private startObserving(): void {
    if (typeof MutationObserver === "undefined") {
      console.warn("[Nura] MutationObserver not available")
      return
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            if (element.hasAttribute("data-nu-scope")) {
              this.indexElement(element)
            }
            this.scan(element)
          }
        })

        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            const id = element.id
            if (id && this.elements.has(id)) {
              this.elements.delete(id)
            }
          }
        })

        if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
          const element = mutation.target as HTMLElement
          if (element.hasAttribute("data-nu-scope")) {
            this.indexElement(element)
          }
        }
      })
    })

    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-nu-scope", "data-nu-listen", "data-nu-act", "data-nu-meta"],
    })
  }

  public stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  public destroy(): void {
    this.stopObserving()
    this.elements.clear()
  }
}
