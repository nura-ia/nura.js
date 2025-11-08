=== QUALITY_CHECKLIST.md ===

## Matriz de cumplimiento
| Check | @nura/core | @nura/plugin-voice | @nura/plugin-fuzzy | @nura/vue | @nura/devtools-lexicon | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| TS estricto (`strict: true`) | ✅ | ✅ | ✅ | ✅ | ⚠️ (usa `tsconfig.base`, pero sin build propia) | Voz/Vue declaran `strict` en `tsconfig`. Devtools no compila. 【F:packages/core/tsconfig.json†L1-L8】【F:packages/plugin-voice/tsconfig.json†L1-L12】【F:packages/plugin-fuzzy/tsconfig.json†L1-L8】【F:packages/vue/tsconfig.json†L1-L12】【F:packages/devtools-lexicon/package.json†L16-L26】 |
| Formato/target ESM | ✅ (`module":"./dist/index.js"`) | ✅ | ✅ | ✅ | ⚠️ (exporta `./src/index.ts`) | Sólo `@nura/dom` ofrece CJS; devtools expone fuentes. 【F:packages/core/package.json†L16-L35】【F:packages/plugin-voice/package.json†L16-L23】【F:packages/plugin-fuzzy/package.json†L16-L23】【F:packages/vue/package.json†L16-L23】【F:packages/devtools-lexicon/package.json†L16-L26】 |
| Tipos `.d.ts` generados | ✅ (`tsup --dts`) | ✅ | ✅ | ✅ | ❌ | Devtools carece de build/typegen. 【F:packages/core/package.json†L73-L78】【0167cd†L1-L10】 |
| `sideEffects:false` / tree-shake | ✅ | ✅ | ✅ | ✅ | ⚠️ (no bundle) | Todos marcan `sideEffects:false` salvo devtools. 【F:packages/core/package.json†L66-L72】【F:packages/plugin-voice/package.json†L20-L26】【F:packages/plugin-fuzzy/package.json†L20-L26】【F:packages/vue/package.json†L20-L26】 |
| Accesibilidad | ⚠️ (`ensureA11y` sólo en dev) | ⚠️ (sin prompts a11y) | N/A | ⚠️ (`ensureA11y` sólo warn) | ❌ | Vue emite warnings en modo dev; falta soporte productivo/atributos por defecto. 【F:packages/vue/src/index.ts†L40-L96】 |
| i18n listo | ✅ (`createI18n`, seeds) | ✅ (detectLocale, setLocale) | N/A | ⚠️ (sólo directiva manual) | ⚠️ (usa panel en locale activo) | Vue depende del contexto `NContext`. 【F:packages/core/src/i18n.ts†L18-L60】【F:packages/plugin-voice/src/index.ts†L118-L358】【F:packages/vue/src/i18n.ts†L1-L18】【F:packages/devtools-lexicon/src/panel.vue†L33-L139】 |
| Tests unitarios | ❌ (`test`: `(todo)`) | ✅ (node:test) | ✅ (node:test) | ❌ (`test`: `(todo)`) | ❌ | Cobertura limitada a fuzzy/voice. 【F:packages/core/package.json†L73-L78】【F:packages/plugin-voice/package.json†L27-L31】【F:packages/plugin-voice/test/matchUtterance.spec.mjs†L1-L107】【F:packages/plugin-fuzzy/package.json†L27-L31】【F:packages/plugin-fuzzy/test/fuzzy.spec.mjs†L1-L139】【F:packages/vue/package.json†L25-L31】 |
| CI configurada | ✅ (Turbo + Changesets) | ✅ | ✅ | ✅ | ⚠️ (no build job) | Workflow único ejecuta build/test/lint sobre todos los paquetes. 【F:.github/workflows/ci.yml†L1-L27】 |
| Compatibilidad SSR/Edge | ❌ (`document` implícito) | ⚠️ (`window` con guard) | ✅ (pure functions) | ❌ (`DOMIndexer`) | ❌ | Core/Vue/Devtools requieren refactor para ambientes sin DOM. 【F:packages/core/src/index.ts†L18-L23】【F:packages/plugin-voice/src/index.ts†L48-L399】【F:packages/dom/src/indexer.ts†L16-L179】【F:packages/devtools-lexicon/src/index.ts†L1-L31】 |

## Lista "release-ready"
- [ ] `pnpm install && pnpm -r build` sin errores (añadir job dedicado a devtools). 【F:packages/devtools-lexicon/package.json†L16-L26】
- [ ] Ejecutar `pnpm -r test` con suites reales para `@nura/core` y `@nura/vue`. 【F:packages/core/package.json†L73-L78】【F:packages/vue/package.json†L25-L31】
- [ ] Añadir verificación de tamaños (`size-limit` o similar) para `plugin-voice`/`plugin-fuzzy`. 【F:packages/plugin-voice/src/matchUtterance.ts†L30-L147】【F:packages/plugin-fuzzy/src/fuzzy.ts†L25-L105】
- [ ] Documentar y testear integración SSR (guards contra `document`/`window`). 【F:packages/core/src/index.ts†L18-L23】【F:packages/dom/src/indexer.ts†L16-L179】
- [ ] Publicar changelog automatizado vía Changesets después de estabilizar APIs experimentales. 【F:.changeset/config.json†L1-L11】
