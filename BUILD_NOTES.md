=== BUILD_NOTES.md ===

## Flujos de compilación por paquete
- **@nura/core**
  - Comando: `pnpm --filter @nura/core build`
  - Herramienta: `tsup` (`src/*.ts` → `dist/index.js` ESM + `.d.ts`). 【F:packages/core/package.json†L73-L78】
  - `exports`: módulos por archivo (`.`, `./i18n`, `./lexicon`, `./entities`, `./registry`, `./actions`, etc.) sólo en formato ESM. 【F:packages/core/package.json†L19-L52】
  - Notas: depende de `@nura/plugin-fuzzy`, por lo que debe compilarse antes o con `pnpm -r build`.

- **@nura/plugin-voice**
  - Comando: `pnpm --filter @nura/plugin-voice build`
  - Herramienta: `tsup src/index.ts --dts --format esm` (verificado). 【F:packages/plugin-voice/package.json†L27-L31】【0167cd†L1-L10】
  - Salida: `dist/index.js` (ES2020) + `dist/index.d.ts`.
  - Dependencias runtime: `@nura/core`, `@nura/plugin-fuzzy`; requiere Web Speech API o polyfill propio. `getWindow()` evita fallos en Node pero no provee fallback de reconocimiento. 【F:packages/plugin-voice/src/index.ts†L42-L399】
  - `exports`: sólo entrada ESM `.`.

- **@nura/plugin-fuzzy**
  - Comando: `pnpm --filter @nura/plugin-fuzzy build`
  - Herramienta: `tsup` (ESM + `.d.ts`). 【F:packages/plugin-fuzzy/package.json†L27-L31】
  - Pure functions sin dependencias Web/DOM; ideal para Node/browser.

- **@nura/vue**
  - Comando: `pnpm --filter @nura/vue build`
  - Herramienta: `tsup` (ESM + `.d.ts`). 【F:packages/vue/package.json†L25-L31】
  - Requiere `vue@>=3.3` como peer y `@nura/core` en runtime. Usa `DOMIndexer` (DOM requerido en cliente). 【F:packages/vue/src/index.ts†L98-L263】【F:packages/vue/src/plugin.ts†L17-L54】

- **@nura/dom**
  - Comando: `pnpm --filter @nura/dom build`
  - Herramienta: `tsup src/index.ts --format cjs,esm --dts --treeshake` (único paquete con doble target). 【F:packages/dom/package.json†L16-L28】
  - `exports`: `{ import: ./dist/index.mjs, require: ./dist/index.js }` con tipos. 【F:packages/dom/package.json†L16-L23】
  - Nota: utiliza `document`/`MutationObserver`; no apto para SSR sin mocks. 【F:packages/dom/src/indexer.ts†L16-L179】

- **@nura/devtools-lexicon**
  - No tiene script de build ni `files` declarados; `exports` apunta a `./src/index.ts` que importa `.vue` y CSS. 【F:packages/devtools-lexicon/package.json†L16-L26】【F:packages/devtools-lexicon/src/index.ts†L1-L31】
  - Recomendado: configurar Vite/tsup para emitir bundle ESM + CSS separado si se planea publicar.

## Pasos globales
1. `pnpm install`
2. `pnpm -r build` (Turbo ejecuta builds respetando dependencias). 【F:package.json†L20-L31】【F:turbo.json†L4-L14】
3. `pnpm -r test` (actualmente sólo fuzzy/voice tienen suites reales). 【F:packages/plugin-voice/package.json†L27-L31】【F:packages/plugin-fuzzy/package.json†L27-L31】

## Notas de bundlers
- Orientado a ESM (Node >=18 con `moduleResolution: bundler`). Use Vite/Rollup. Para Webpack, habilitar `experiments.outputModule` o transpilar a CJS manualmente.
- `@nura/plugin-voice` necesita disponibilidad de `window.SpeechRecognition`. En entornos sin API, exponer wrapper propio que pase `options.intents` para pruebas manuales. 【F:packages/plugin-voice/src/index.ts†L272-L399】
- `@nura/vue` genera ESM sin `.vue` en dist, por lo que se integra en proyectos Vue 3 con tree-shaking (marcado `sideEffects:false`). 【F:packages/vue/package.json†L16-L26】
- `@nura/dom` incluye build CJS para integraciones Next.js/SSR que ejecuten sólo en cliente.

## Problemas conocidos y workarounds
- Falta build en `@nura/devtools-lexicon`: usar `vite build` manual o consumir vía alias local hasta que se empaquete. 【F:packages/devtools-lexicon/package.json†L16-L26】
- SSR/Edge: `Nura.start`, `DOMIndexer` y `mountLexiconPanel` requieren guards (`if (typeof document !== 'undefined')`). Considerar exportar adaptadores server-safe. 【F:packages/core/src/index.ts†L18-L23】【F:packages/dom/src/indexer.ts†L16-L179】【F:packages/devtools-lexicon/src/index.ts†L1-L31】
- Tests incompletos: antes de publicar, añadir suites para core/vue y habilitar coverage en CI. 【F:packages/core/package.json†L73-L78】【F:packages/vue/package.json†L25-L31】【F:.github/workflows/ci.yml†L19-L27】
