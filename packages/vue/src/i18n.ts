import type { App, DirectiveBinding } from 'vue'
import type { NContext } from '@nura/core'

export function installI18nDirective(app: App, ctx: NContext) {
  app.directive('nu-i18n', {
    mounted(
      el,
      binding: DirectiveBinding<{
        ns: string
        key: string
        vars?: Record<string, unknown>
      }>,
    ) {
      const { ns, key, vars } = binding.value ?? { ns: 'common', key: '' }
      el.textContent = ctx.registry.i18n.t(ns, key, vars)
    },
    updated(el, binding) {
      const { ns, key, vars } = binding.value ?? { ns: 'common', key: '' }
      el.textContent = ctx.registry.i18n.t(ns, key, vars)
    },
  })
}
