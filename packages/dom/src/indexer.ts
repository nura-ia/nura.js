import type { NuraElement, NuraScope, NuraVerb } from '@nura-js/core'
import { parseVerbList } from './verbs'

export interface DOMIndexerOptions {
  root?: HTMLElement
  autoScan?: boolean
  observeChanges?: boolean
}

type ResolvedDOMIndexerOptions = {
  autoScan: boolean
  observeChanges: boolean
}

const ELEMENT_NODE = 1

function defaultRoot(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.body
}

export class DOMIndexer {
  private readonly elements = new Map<string, NuraElement>()
  private readonly generatedIds = new WeakMap<HTMLElement, string>()
  private observer: MutationObserver | null = null
  private readonly root: HTMLElement | null
  private readonly options: ResolvedDOMIndexerOptions

  constructor(options: DOMIndexerOptions = {}) {
    this.root = options.root ?? defaultRoot()
    this.options = {
      autoScan: options.autoScan ?? true,
      observeChanges: options.observeChanges ?? true,
    }

    if (this.options.autoScan) this.scan()
    if (this.options.observeChanges) this.startObserving()
  }

  private generateId(element: HTMLElement): string {
    if (element.id) return element.id
    const existing = this.generatedIds.get(element)
    if (existing) return existing
    const scope = element.getAttribute('data-nu-scope') || 'unknown'
    const id = `nu-${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.generatedIds.set(element, id)
    return id
  }

  private removeElement(element: HTMLElement): void {
    for (const [id, indexed] of this.elements) {
      if (indexed.element === element) this.elements.delete(id)
    }
  }

  private removeTree(element: HTMLElement): void {
    for (const [id, indexed] of this.elements) {
      if (indexed.element === element || element.contains(indexed.element)) {
        this.elements.delete(id)
      }
    }
  }

  private indexElement(element: HTMLElement): NuraElement | null {
    this.removeElement(element)
    const scope = element.getAttribute('data-nu-scope')
    if (!scope) return null

    const verbs = Array.from(
      new Set([
        ...parseVerbList(element.getAttribute('data-nu-listen')),
        ...parseVerbList(element.getAttribute('data-nu-act')),
      ]),
    )
    if (verbs.length === 0) return null

    let metadata: Record<string, unknown> = {}
    const metadataValue = element.getAttribute('data-nu-meta')
    if (metadataValue) {
      try {
        const parsed: unknown = JSON.parse(metadataValue)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          metadata = parsed as Record<string, unknown>
        }
      } catch {
        console.warn('[Nura] Failed to parse data-nu-meta')
      }
    }

    const indexed: NuraElement = {
      id: this.generateId(element),
      scope,
      verbs,
      element,
      metadata,
    }
    this.elements.set(indexed.id, indexed)
    return indexed
  }

  scan(root?: HTMLElement): NuraElement[] {
    const scanRoot = root ?? this.root
    if (!scanRoot) return []
    this.removeTree(scanRoot)

    const candidates: HTMLElement[] = []
    if (scanRoot.hasAttribute('data-nu-scope')) candidates.push(scanRoot)
    scanRoot
      .querySelectorAll<HTMLElement>('[data-nu-scope]')
      .forEach((element) => candidates.push(element))

    const indexed: NuraElement[] = []
    for (const element of candidates) {
      const result = this.indexElement(element)
      if (result) indexed.push(result)
    }
    return indexed
  }

  findByScope(scope: NuraScope): NuraElement[] {
    return Array.from(this.elements.values()).filter(
      (element) => element.scope === scope,
    )
  }

  findByVerb(verb: NuraVerb): NuraElement[] {
    return Array.from(this.elements.values()).filter((element) =>
      element.verbs.includes(verb),
    )
  }

  findById(id: string): NuraElement | undefined {
    return this.elements.get(id)
  }

  getAll(): NuraElement[] {
    return Array.from(this.elements.values())
  }

  private startObserving(): void {
    if (!this.root || typeof MutationObserver === 'undefined') return

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== ELEMENT_NODE) continue
          this.scan(node as HTMLElement)
        }
        for (const node of mutation.removedNodes) {
          if (node.nodeType !== ELEMENT_NODE) continue
          this.removeTree(node as HTMLElement)
        }
        if (
          mutation.type === 'attributes' &&
          mutation.target.nodeType === ELEMENT_NODE
        ) {
          this.indexElement(mutation.target as HTMLElement)
        }
      }
    })

    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-nu-scope',
        'data-nu-listen',
        'data-nu-act',
        'data-nu-meta',
      ],
    })
  }

  stopObserving(): void {
    this.observer?.disconnect()
    this.observer = null
  }

  destroy(): void {
    this.stopObserving()
    this.elements.clear()
  }
}
