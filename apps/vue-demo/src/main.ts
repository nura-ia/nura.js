import { createApp } from 'vue'
import App from './App.vue'
import { Nura, createRegistry, type NAction, type NContext } from '@nura/core'
import { withVue } from '@nura/vue'
import { mountLexiconPanel } from '@nura/devtools-lexicon'
import { installNuraBridge } from './nura/bootstrap.js'

const registry = createRegistry({
  config: { app: { id: 'demo-nura' } },
  actionCatalog: {
    async dispatch(action: NAction) {
      console.info('[demo] ejecutando acción', action)
      return { ok: true }
    },
  },
})

const nura = new Nura({ registry })

const ctx: NContext = {
  registry,
  act: (action: NAction) => nura.act(action),
  select: (selector: string) => Array.from(document.querySelectorAll(selector)),
  audit: registry.audit,
  i18n: registry.i18n,
  lexicon: registry.lexicon,
}

installNuraBridge(nura, ctx)

const app = createApp(App)
withVue(nura).install(app)
nura.start()

app.mount('#app')

if (import.meta.env.DEV) {
  setTimeout(() => {
    mountLexiconPanel(ctx, {
      title: 'Lexicon Studio',
      defaultLocale: 'es-CR',
    })
  }, 1000)
}
