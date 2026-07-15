import type { NuraElement, NuraScope, NuraVerb } from '@nura-js/core'
import { parseVerbList } from './verbs'

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

function defaultRoot(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.body
}

function scopeCandidates(root: HTMLElement): HTMLElement[] {
  const values: HTMLElement[] = []
  if (root.hasAttribute('data-nu-scope')) values.push(root)
  root
    .querySelectorAll<HTMLElement>('[data-nu-scope]')
    .forEach((element) => values.push(element))
  return values
}

function actionCandidates(root: HTMLElement): HTMLElement[] {
  const values: HTMLElement[] = []
  if (root.hasAttribute('data-nu-listen') || root.hasAttribute('data-nu-act')) {
    values.push(root)
  }
  root
    .querySelectorAll<HTMLElement>('[data-nu-listen], [data-nu-act]')
    .forEach((element) => values.push(element))
  return values
}

export function scanDOM(root?: HTMLElement): ScanResult {
  const resolvedRoot = root ?? defaultRoot()
  const elements: NuraElement[] = []
  const scopes = new Set<NuraScope>()
  const verbs = new Set<NuraVerb>()
  const byScope: Record<NuraScope, number> = {}
  const byVerb: Partial<Record<NuraVerb, number>> = {}

  if (resolvedRoot) {
    for (const element of scopeCandidates(resolvedRoot)) {
      const scope = element.getAttribute('data-nu-scope')
      if (!scope) continue
      const elementVerbs = Array.from(
        new Set([
          ...parseVerbList(element.getAttribute('data-nu-listen')),
          ...parseVerbList(element.getAttribute('data-nu-act')),
        ]),
      )
      if (elementVerbs.length === 0) continue

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
        id: element.id || `nu-${scope}-${elements.length}`,
        scope,
        verbs: elementVerbs,
        element,
        metadata,
      }
      elements.push(indexed)
      scopes.add(scope)
      byScope[scope] = (byScope[scope] ?? 0) + 1
      for (const verb of elementVerbs) {
        verbs.add(verb)
        byVerb[verb] = (byVerb[verb] ?? 0) + 1
      }
    }
  }

  return {
    elements,
    scopes,
    verbs,
    stats: { total: elements.length, byScope, byVerb },
  }
}

export function findElementsByScope(
  scope: NuraScope,
  root?: HTMLElement,
): HTMLElement[] {
  const resolvedRoot = root ?? defaultRoot()
  if (!resolvedRoot) return []
  return scopeCandidates(resolvedRoot).filter(
    (element) => element.getAttribute('data-nu-scope') === scope,
  )
}

export function findElementsByVerb(
  verb: NuraVerb,
  root?: HTMLElement,
): HTMLElement[] {
  const resolvedRoot = root ?? defaultRoot()
  if (!resolvedRoot) return []
  return actionCandidates(resolvedRoot).filter((element) => {
    const verbs = [
      ...parseVerbList(element.getAttribute('data-nu-listen')),
      ...parseVerbList(element.getAttribute('data-nu-act')),
    ]
    return verbs.includes(verb)
  })
}
