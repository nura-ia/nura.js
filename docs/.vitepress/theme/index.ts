import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { watch } from 'vue'
import { useData } from 'vitepress'
import './custom.css'
import {
  detectLocale,
  getStoredLocale,
  persistLocale,
  DEFAULT_LOCALE,
  type LocaleCode,
} from '../i18n/config'

const theme: Theme = {
  ...DefaultTheme,
  enhanceApp({ router, app }) {
    DefaultTheme.enhanceApp?.({ router, app })

    if (typeof window !== 'undefined') {
      const stored = getStoredLocale()
      const browserLocale = detectLocale()
      const initialLocale: LocaleCode = stored ?? browserLocale

      if (initialLocale !== DEFAULT_LOCALE) {
        const path = router.route.path
        if (!path.startsWith(`/${initialLocale}/`)) {
          const normalized = path === '/' ? '' : path
          router.go(`/${initialLocale}${normalized}`)
        }
      }

      app.mixin({
        setup() {
          const { lang } = useData()

          watch(
            () => lang.value,
            (value) => {
              const normalized: LocaleCode = value.startsWith('es') ? 'es' : 'en'
              persistLocale(normalized)
            },
            { immediate: true }
          )
        },
      })
    }
  },
}

export default theme
