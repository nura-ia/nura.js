=== API_SURVEY.md ===

# @nura/core
## Principales exportaciones
- `class Nura` — Ejecuta acciones con control de permisos, confirmaciones y auditoría. Usa `registry.actions` y emite logs de auditoría. 【F:packages/core/src/index.ts†L10-L78】
- `createRegistry(options)` — Crea registro con catálogo de acciones, i18n, léxico, telemetría y permisos dinámicos. Devuelve objeto `NRegistry`. 【F:packages/core/src/create-registry.ts†L123-L266】
- `createActionCatalog(initial, specs)` y `defineActionSpec(spec)` — Catalogo/fábrica de especificaciones con despacho para acciones modernas o legadas. 【F:packages/core/src/actions.ts†L14-L60】
- `createI18n(config)` — Motor de traducciones con bundles, fallback y telemetría de misses. 【F:packages/core/src/i18n.ts†L18-L60】
- `createLexicon(telemetry?)` — Registro de sinónimos y normalización fonética. 【F:packages/core/src/lexicon.ts†L19-L119】
- `createTelemetry()` — Bus sencillo publish/subscribe para eventos. 【F:packages/core/src/telemetry.ts†L1-L27】
- Parsers de entidades: `parseBoolean`, `parseEnum`, `parseDate`, `parseRangeNumber`, `parseNumber`, `defaultFormat`. 【F:packages/core/src/entities/parsers.ts†L19-L147】【F:packages/core/src/entities.ts†L1-L18】
- Seeds y helpers: `seedLexicon`, `collectCommandVariants`, `collectEntityVariants`, `collectWakeVariants`. 【F:packages/core/src/seeds/lexicon.ts†L1-L31】【F:packages/core/src/registry/deriveIntents.ts†L1-L43】

## Tipos clave
| Tipo | Descripción |
| --- | --- |
| `NActionSpec` | Define intents multilingües, entidades, validadores y aliases para wake words/entidades. 【F:packages/core/src/types.ts†L69-L94】 |
| `NEntityDef` | Describe entidades (`boolean`, `enum`, `date`, etc.) y hooks `parse/format`. 【F:packages/core/src/types.ts†L30-L43】 |
| `NPermissionRule` / `NuraPermission` | Configuran políticas por scope y roles, incluyendo confirmaciones. 【F:packages/core/src/types.ts†L103-L205】 |
| `NRegistry` | Registro completo con acciones, i18n, léxico y telemetría. 【F:packages/core/src/types.ts†L154-L173】 |

## Ejemplo mínimo
```ts
import { Nura, createRegistry, defineActionSpec } from '@nura/core'

const registry = createRegistry({
  config: { app: { id: 'app', locale: 'es' } },
  specs: [
    defineActionSpec({
      name: 'open::orders',
      type: 'open',
      phrases: { es: { canonical: ['abre pedidos'] } },
    }),
  ],
})

const nura = new Nura({ registry })
await nura.act({ type: 'open', target: 'orders' })
```

# @nura/plugin-voice
## Principales exportaciones
- `voiceAgent(options)` — Agente `NAgent` que escucha wake words, detecta idioma y ejecuta intents via `ctx.act`. 【F:packages/plugin-voice/src/index.ts†L272-L399】
- `deriveIntentsFromSpecs(specs, ctx, locale)` — Convierte `NActionSpec` en intents con expresiones regulares y parsers de entidades. 【F:packages/plugin-voice/src/index.ts†L166-L252】
- `matchUtterance(ctx, text, intents, opts)` — Rankea intents con pesos para wake/token/entities/global, anotando confianza. 【F:packages/plugin-voice/src/matchUtterance.ts†L30-L147】
- `detectLocale(text, candidates)` — Heurística ligera ES/EN para priorizar idioma. 【F:packages/plugin-voice/src/index.ts†L118-L138】
- Wake helpers: `normalizeWakeWords`, `detectWake`, `stripWake`. 【F:packages/plugin-voice/src/wake.ts†L20-L85】
- Utilidades de texto: `normalizeUtterance`, `stripDiacritics`. 【F:packages/plugin-voice/src/text.ts†L3-L24】

## Opciones de `NVoiceOptions`
| Opción | Default | Uso |
| --- | --- | --- |
| `wakeWords` | `undefined` | Wake words personalizados (string o `{ canonical, aliases, minConfidence }`). 【F:packages/plugin-voice/src/types.ts†L16-L30】 |
| `intents` | `[]` | Intents extra manuales (callbacks). 【F:packages/plugin-voice/src/types.ts†L4-L30】 |
| `language` | `registry.i18n.getLocale()` | Forzar idioma inicial. 【F:packages/plugin-voice/src/index.ts†L273-L285】 |
| `keyWake` | `'F2'` | Hotkey dev para activar prompt. 【F:packages/plugin-voice/src/index.ts†L272-L383】 |
| `autoStart` | `false` | Intentar `SpeechRecognition.start()` automáticamente. 【F:packages/plugin-voice/src/index.ts†L385-L392】 |
| `devMode` | `false` | Evita `ctx.act` y emite telemetría de ranking. 【F:packages/plugin-voice/src/matchUtterance.ts†L132-L161】 |

## Ejemplo mínimo
```ts
import { voiceAgent, deriveIntentsFromSpecs } from '@nura/plugin-voice'

const agent = voiceAgent({ wakeWords: ['ok nura'] })
registry.actions.register(defineActionSpec({
  name: 'open::orders',
  type: 'open',
  phrases: { es: { canonical: ['abre pedidos'] } },
}))
await agent.start({ registry, act: (action) => nura.act(action) } as any)
```

# @nura/plugin-fuzzy
## Principales exportaciones
- `matchFuzzy(input, candidates, opts)` — Coincidencia híbrida Damerau + phonetics con `minConfidence`. 【F:packages/plugin-fuzzy/src/fuzzy.ts†L188-L360】
- `compareWakeWord(input, wake, opts)` — Especialización para wake words con `tokenizeAndScore`. 【F:packages/plugin-fuzzy/src/fuzzy.ts†L403-L428】
- `tokenizeAndScore(input, candidates, opts)` — Puntajes por token, expone `via` (`exact`, `phonetic`, `edit`). 【F:packages/plugin-fuzzy/src/fuzzy.ts†L430-L459】
- `damerauLevenshteinSimilarity(a, b)` — Similaridad normalizada para ranking global. 【F:packages/plugin-fuzzy/src/fuzzy.ts†L41-L85】

## Ejemplo mínimo
```ts
import { matchFuzzy, compareWakeWord } from '@nura/plugin-fuzzy'

matchFuzzy('menu pedidos', ['menú pedidos', 'cierra pedidos'], { locale: 'es' })
compareWakeWord('ok nora abre', { canonical: 'nura', aliases: ['nora'] })
```

# @nura/vue
## Principales exportaciones
- `withVue(nura)` — Plugin ligero que registra directivas `v-nu-act`, `v-nu-guard`, `v-nu-listen` y provee la instancia `Nura`. 【F:packages/vue/src/index.ts†L98-L263】
- Directiva `v-nu-act` — Bindea acciones modernas/legadas a eventos de clic con atributos `data-nu-*`. 【F:packages/vue/src/index.ts†L119-L146】
- Directiva `v-nu-guard` — Controla visibilidad/estado según permisos y roles. 【F:packages/vue/src/index.ts†L148-L258】
- Composables: `useNura`, `useNuraAction`, `useNuraPermission`, `useHasPermission`, `useNuraEvent(s)`. 【F:packages/vue/src/composables/use-nura.ts†L1-L11】【F:packages/vue/src/composables/use-nura-action.ts†L14-L59】【F:packages/vue/src/composables/use-nura-permission.ts†L11-L65】【F:packages/vue/src/composables/use-nura-events.ts†L5-L35】
- `NuraPlugin` + `useNuraInstance()` — Integración completa con `DOMIndexer`. 【F:packages/vue/src/plugin.ts†L17-L54】
- `installI18nDirective(app, ctx)` — Directiva `v-nu-i18n` para textos traducidos. 【F:packages/vue/src/i18n.ts†L1-L18】

## Ejemplo mínimo
```ts
const nura = new Nura({ registry })
app.use(withVue(nura))

<button v-nu-act="{ type: 'open', target: 'orders' }" aria-label="Abrir pedidos">Abrir</button>
<div v-nu-guard="{ scope: 'orders', action: 'delete', hideIfForbidden: true }">...</div>
```

# @nura/devtools-lexicon (Lexicon Studio)
## Exportaciones
- `mountLexiconPanel(ctx, opts?)` — Inserta panel Vue 3 para editar sinónimos y probar utterances; retorna función `dispose`. 【F:packages/devtools-lexicon/src/index.ts†L1-L31】【F:packages/devtools-lexicon/src/panel.vue†L1-L208】
- Helpers para lista/import/export de términos (`listTerms`, `setTerm`, etc.). 【F:packages/devtools-lexicon/src/store.ts†L1-L24】

## Ejemplo mínimo
```ts
import { mountLexiconPanel } from '@nura/devtools-lexicon'
const teardown = mountLexiconPanel(ctx, { title: 'Lexicon Studio', defaultLocale: 'es' })
// ...
teardown()
```

# Matriz de estabilidad
| Paquete / API | Estado |
| --- | --- |
| `@nura/core` (`Nura`, `createRegistry`, tipos principales) | **Experimental** — API consistente pero faltan pruebas y pautas de versionado. 【F:packages/core/package.json†L73-L78】 |
| Parsers (`parseBoolean`, `parseRangeNumber`, etc.) | **Experimental** — Cobertura parcial para escenarios multilenguaje. 【F:packages/core/src/entities/parsers.ts†L19-L147】 |
| `@nura/plugin-voice` (`voiceAgent`, `matchUtterance`, wake helpers) | **Experimental** — Depende de Web Speech y heurísticas en evolución. 【F:packages/plugin-voice/src/index.ts†L42-L399】 |
| `@nura/plugin-fuzzy` (`matchFuzzy`, `tokenizeAndScore`) | **Stable β** — Algoritmos probados con suite de tests extensa. 【F:packages/plugin-fuzzy/src/fuzzy.ts†L1-L459】【F:packages/plugin-fuzzy/test/fuzzy.spec.mjs†L11-L134】 |
| `@nura/vue` (`withVue`, composables) | **Experimental** — Falta test coverage y guía SSR. 【F:packages/vue/package.json†L25-L31】【F:packages/vue/src/index.ts†L1-L263】 |
| `@nura/devtools-lexicon` (`mountLexiconPanel`) | **Prototype** — Sin build oficial, pensado para demos internas. 【F:packages/devtools-lexicon/package.json†L16-L26】 |
