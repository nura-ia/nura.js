import type { App, DirectiveBinding, InjectionKey } from 'vue'
import type { LegacyNuraAction, ModernNAction, NAction, Nura } from '@nura/core'

type ImportMetaWithEnv = ImportMeta & { env?: { MODE?: string } }
type NuActElement = HTMLElement & {
  __nuActHandler__?: EventListener
  __nuActValue__?: NAction
  __nuActDescManaged__?: boolean
}

type GuardBinding = {
  scope: string
  action: string
  when?: 'always' | 'auto'
  hideIfForbidden?: boolean
  disabledStyle?: boolean
}

type NuGuardElement = NuActElement & {
  __nuGuardOriginalDisplay__?: string | null
  __nuGuardOriginalPointerEvents__?: string | null
  __nuGuardOriginalOpacity__?: string | null
  __nuGuardWrappedOriginal__?: EventListener
  __nuGuardWrappedHandler__?: EventListener
}

export const NURA_KEY: InjectionKey<Nura> = Symbol('nura')

function hasRoleFor(nura: Nura, scope: string, action: string): boolean {
  const perms = (nura as any)['#registry']?.permissions ?? (nura as any)['registry']?.permissions
  const actor = (nura as any)['registry']?.config?.actor?.()
  const rule = perms?.scopes?.[scope]?.[action]
  if (!rule) return true
  const roles = new Set(actor?.roles ?? [])
  const need: string[] = rule.roles ?? []
  if (need.length === 0) return true
  return need.some((role) => roles.has(role))
}

function ensureA11y(el: HTMLElement) {
  const mode = (import.meta as ImportMetaWithEnv).env?.MODE
  if (mode === 'production') return
  if (!el.hasAttribute('data-nu-act')) return
  const hasAria = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
  const hasDesc = el.hasAttribute('data-nu-desc')
  if (!hasAria && !hasDesc) {
    console.warn('[nura][a11y] Falta aria-label o data-nu-desc en un elemento con data-nu-act:', el)
  }
}

function isModernAction(action?: NAction): action is ModernNAction {
  return !!action && 'type' in action
}

function isLegacyAction(action?: NAction): action is LegacyNuraAction {
  return !!action && 'verb' in action
}

function getActionDescription(action?: NAction) {
  if (!action) return undefined
  if (isModernAction(action)) return action.meta?.desc
  if (isLegacyAction(action)) return action.description
  return undefined
}

function serializeAction(action: NAction) {
  try {
    const json = JSON.stringify(action)
    return json ?? 'null'
  } catch {
    return 'null'
  }
}

function applyActionState(el: NuActElement, action: NAction | undefined) {
  el.__nuActValue__ = action
  if (!action) {
    el.removeAttribute('data-nu-act')
    if (el.__nuActDescManaged__) {
      el.removeAttribute('data-nu-desc')
      delete el.__nuActDescManaged__
    }
    return
  }
  const serialized = serializeAction(action)
  el.setAttribute('data-nu-act', serialized)
  const desc = getActionDescription(action)
  if (desc) {
    el.setAttribute('data-nu-desc', desc)
    el.__nuActDescManaged__ = true
  } else if (el.__nuActDescManaged__) {
    el.removeAttribute('data-nu-desc')
    delete el.__nuActDescManaged__
  }
  ensureA11y(el)
}

export function withVue(nura: Nura) {
  return {
    install(app: App) {
      app.provide(NURA_KEY, nura)

      app.directive('nu-listen', {
        mounted(el: HTMLElement, binding: DirectiveBinding) {
          el.setAttribute('data-nu-listen', 'dom')
          if (binding.modifiers.soft) el.setAttribute('data-nu-priority', 'soft')
          if (binding.modifiers.deep) el.setAttribute('data-nu-priority', 'hard')
          if (binding.arg === 'scope') el.setAttribute('data-nu-scope', String(binding.value))
        },
        updated() {
        },
        unmounted() {
        }
      })

      app.directive('nu-act', {
        mounted(element: HTMLElement, binding: DirectiveBinding<NAction>) {
          const el = element as NuActElement
          applyActionState(el, binding.value)
          const handler: EventListener = () => {
            const current = el.__nuActValue__
            if (!current) return
            void nura.act(current)
          }
          el.__nuActHandler__ = handler
          element.addEventListener('click', handler, { passive: true })
        },
        updated(element: HTMLElement, binding: DirectiveBinding<NAction>) {
          applyActionState(element as NuActElement, binding.value)
        },
        unmounted(element: HTMLElement) {
          const el = element as NuActElement
          if (el.__nuActHandler__) {
            element.removeEventListener('click', el.__nuActHandler__)
            delete el.__nuActHandler__
          }
          delete el.__nuActValue__
          if (el.__nuActDescManaged__) {
            element.removeAttribute('data-nu-desc')
            delete el.__nuActDescManaged__
          }
        }
      })

      function applyGuardAccess(el: NuGuardElement, opts: GuardBinding, can: boolean) {
        if (!can) {
          if (opts.hideIfForbidden) {
            if (el.__nuGuardOriginalDisplay__ === undefined) {
              el.__nuGuardOriginalDisplay__ = el.style.display
            }
            el.style.display = 'none'
          } else if (opts.disabledStyle !== false) {
            if (el.__nuGuardOriginalPointerEvents__ === undefined) {
              el.__nuGuardOriginalPointerEvents__ = el.style.pointerEvents
            }
            if (el.__nuGuardOriginalOpacity__ === undefined) {
              el.__nuGuardOriginalOpacity__ = el.style.opacity
            }
            el.setAttribute('aria-disabled', 'true')
            el.style.pointerEvents = 'none'
            el.style.opacity = '0.55'
          }
          return
        }

        if (opts.hideIfForbidden) {
          if (el.__nuGuardOriginalDisplay__ !== undefined) {
            el.style.display = el.__nuGuardOriginalDisplay__ ?? ''
            delete el.__nuGuardOriginalDisplay__
          } else {
            el.style.display = ''
          }
        } else if (opts.disabledStyle !== false) {
          if (el.__nuGuardOriginalPointerEvents__ !== undefined) {
            el.style.pointerEvents = el.__nuGuardOriginalPointerEvents__ ?? ''
            delete el.__nuGuardOriginalPointerEvents__
          } else {
            el.style.pointerEvents = ''
          }
          if (el.__nuGuardOriginalOpacity__ !== undefined) {
            el.style.opacity = el.__nuGuardOriginalOpacity__ ?? ''
            delete el.__nuGuardOriginalOpacity__
          } else {
            el.style.removeProperty('opacity')
          }
          el.removeAttribute('aria-disabled')
        }
      }

      function interceptAct(el: NuGuardElement) {
        const existing = el.__nuActHandler__
        if (!existing) return
        if (el.__nuGuardWrappedHandler__ && el.__nuGuardWrappedHandler__ === existing) return
        const wrapped: EventListener = (ev) => {
          ensureA11y(el)
          return existing.call(el, ev)
        }
        el.removeEventListener('click', existing)
        el.addEventListener('click', wrapped, { passive: true })
        el.__nuGuardWrappedOriginal__ = existing
        el.__nuGuardWrappedHandler__ = wrapped
        el.__nuActHandler__ = wrapped
      }

      function releaseIntercept(el: NuGuardElement) {
        const wrapped = el.__nuGuardWrappedHandler__
        const original = el.__nuGuardWrappedOriginal__
        if (wrapped) {
          el.removeEventListener('click', wrapped)
        }
        if (original && el.__nuActHandler__ === wrapped) {
          el.addEventListener('click', original, { passive: true })
          el.__nuActHandler__ = original
        }
        delete el.__nuGuardWrappedHandler__
        delete el.__nuGuardWrappedOriginal__
      }

      function processGuard(el: NuGuardElement, opts: GuardBinding) {
        const can = hasRoleFor(nura, opts.scope, opts.action)
        applyGuardAccess(el, opts, can)

        const when = opts.when ?? 'auto'
        const hasAct = el.hasAttribute('data-nu-act')
        const intercept = when === 'always' || (when === 'auto' && hasAct)

        if (intercept) {
          const runner = () => interceptAct(el)
          if (hasAct) {
            runner()
          } else {
            queueMicrotask(runner)
          }
          if (hasAct) ensureA11y(el)
        } else {
          releaseIntercept(el)
          if (hasAct) ensureA11y(el)
        }
      }

      app.directive('nu-guard', {
        mounted(element: HTMLElement, binding: DirectiveBinding<GuardBinding>) {
          const opts = binding.value
          if (!opts?.scope || !opts?.action) return
          processGuard(element as NuGuardElement, opts)
        },
        updated(element: HTMLElement, binding: DirectiveBinding<GuardBinding>) {
          const opts = binding.value
          if (!opts?.scope || !opts?.action) return
          processGuard(element as NuGuardElement, opts)
        },
        unmounted(element: HTMLElement) {
          releaseIntercept(element as NuGuardElement)
        }
      })
    }
  }
}

export { installI18nDirective } from './i18n'
