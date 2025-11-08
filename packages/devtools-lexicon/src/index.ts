import { createApp as createVueApp } from 'vue'
import type { NContext } from '@nura/core'
import Panel from './panel.vue'
import './styles.css'

export type LexiconPanelOptions = {
  mount?: HTMLElement | string
  title?: string
  defaultLocale?: string
  readOnly?: boolean
}

type VueGlobal = typeof window & { Vue?: { createApp?: typeof createVueApp } }

export function mountLexiconPanel(ctx: NContext, opts: LexiconPanelOptions = {}): () => void {
  const target =
    typeof opts.mount === 'string'
      ? (document.querySelector(opts.mount) as HTMLElement | null)
      : (opts.mount as HTMLElement | null | undefined)
  const host = target ?? createFloatingHost()

  const createAppFn = resolveCreateApp()
  const app = createAppFn(Panel, { ctx, opts })
  app.mount(host)

  return () => {
    app.unmount()
    if (!target && host.parentNode) {
      host.parentNode.removeChild(host)
    }
  }
}

function resolveCreateApp(): typeof createVueApp {
  if (typeof window !== 'undefined') {
    const globalVue = (window as VueGlobal).Vue?.createApp
    if (globalVue) {
      return (component, props) => globalVue(component, props)
    }
  }
  return (component, props) => createVueApp(component, props)
}

function createFloatingHost() {
  const host = document.createElement('div')
  host.id = 'nura-lexicon-panel'
  document.body.appendChild(host)
  return host
}
