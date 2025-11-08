=== STATUS.md ===

## Resumen ejecutivo
- **P0**: El paquete opcional `@nura/devtools-lexicon` sólo exporta fuentes (`.ts`/`.vue`) sin proceso de build ni artefactos declarados, lo que impide publicarlo o consumirlo fuera de Vite/Vue SFCs. 【F:packages/devtools-lexicon/package.json†L1-L26】
- **P0**: `@nura/core` y las utilidades DOM asumen siempre la presencia de `document`, por lo que fallan en SSR/edge a menos que el consumidor ponga guards externos. 【F:packages/core/src/index.ts†L18-L23】【F:packages/dom/src/indexer.ts†L16-L31】
- **P1**: Cobertura de pruebas y linting desigual; los paquetes clave (`@nura/core`, `@nura/vue`) tienen comandos `test` dummy y dependen de CI genérico. 【F:packages/core/package.json†L73-L78】【F:packages/vue/package.json†L25-L31】【F:.github/workflows/ci.yml†L1-L27】
- **P2**: Faltan métricas de rendimiento y límites automatizados para asegurar tamaños/latencias en voice intent matching y léxico. 【F:packages/plugin-voice/src/matchUtterance.ts†L30-L147】【F:packages/core/src/lexicon.ts†L19-L119】

## Mapa del repo
- Monorepo PNPM (`pnpm-workspace.yaml`) con workspaces en `packages/*` y apps de demostración. 【F:pnpm-workspace.yaml†L1-L3】
- Paquetes principales: `core`, `plugin-voice`, `plugin-fuzzy`, `vue`, `dom`, `devtools-lexicon`, más adaptadores React/Svelte y demos. 【490867†L1-L2】
- Configuración transversal: `tsconfig.base.json` (TS estricto, paths), `turbo.json` (build/test/lint), CI (`.github/workflows`). 【F:tsconfig.base.json†L1-L99】【F:turbo.json†L1-L19】【F:.github/workflows/ci.yml†L1-L27】

## Hallazgos por área
1. **Estructura de workspaces** — ✅ Workspaces bien definidos, paquetes con `sideEffects:false` y `exports` explícitos salvo devtools. 【F:packages/core/package.json†L16-L72】【F:packages/plugin-voice/package.json†L16-L26】【F:packages/plugin-fuzzy/package.json†L16-L26】
2. **Compilación** — ⚠️ `tsup` genera ESM + `.d.ts`; sólo `@nura/dom` ofrece CJS. Falta build en devtools y los `tsconfig` de voz/vue desactivan `declaration` (aunque `tsup --dts` lo sobreescribe). 【0167cd†L1-L10】【F:packages/dom/package.json†L16-L28】【F:packages/devtools-lexicon/package.json†L16-L26】【F:packages/plugin-voice/tsconfig.json†L1-L12】
3. **API Pública** — ✅ Contratos tipados: `Nura`, `createRegistry`, `defineActionSpec`, léxico/i18n, agentes de voz, directivas Vue y utilidades fuzzy. 【F:packages/core/src/index.ts†L10-L99】【F:packages/core/src/types.ts†L5-L232】【F:packages/plugin-voice/src/index.ts†L166-L400】【F:packages/plugin-fuzzy/src/fuzzy.ts†L1-L459】【F:packages/vue/src/index.ts†L1-L263】
4. **Pipeline de intents** — ✅ Flujo completo `specs → intents → match → act`, con parsers de entidades, ranking y despacho fallback. 【F:packages/plugin-voice/src/index.ts†L166-L358】【F:packages/plugin-voice/src/matchUtterance.ts†L30-L147】【F:packages/core/src/create-registry.ts†L181-L266】
5. **i18n & sinónimos** — ✅ I18n con bundles/fallback y telemetría, léxico con normalización/phonetics y seeds bilingües. 【F:packages/core/src/i18n.ts†L10-L61】【F:packages/core/src/lexicon.ts†L19-L119】【F:packages/core/src/seeds/lexicon.ts†L1-L31】
6. **Parsers T10–T12** — ⚠️ Cobertura para boolean/enum/date/range_number con heurísticas ES/EN; falta parser dedicado para `enum` largos (>12) y normalización avanzada de rangos. 【F:packages/core/src/entities/parsers.ts†L19-L147】
7. **Fuzzy** — ✅ Estrategias Damerau + Soundex/Metaphone híbridas, cache de hashes y tests amplios. 【F:packages/plugin-fuzzy/src/fuzzy.ts†L1-L459】【F:packages/plugin-fuzzy/test/fuzzy.spec.mjs†L11-L134】
8. **Voz** — ⚠️ Wake words con fuzzy, heurística de idioma y Web Speech API opcional; falta fallback Node y monitoreo de reintentos. 【F:packages/plugin-voice/src/index.ts†L42-L399】【F:packages/plugin-voice/src/wake.ts†L20-L85】
9. **Vue bindings** — ✅ Directivas `v-nu-act`/`v-nu-guard`, guardas de permisos y composables que sincronizan registro/DOM. 【F:packages/vue/src/index.ts†L75-L263】【F:packages/vue/src/composables/use-nura-action.ts†L14-L59】【F:packages/vue/src/composables/use-nura-permission.ts†L11-L65】
10. **Observabilidad** — ⚠️ Telemetría simple (`on/off/emit`) y eventos `voice.*`, `lexicon.*`; falta persistencia y niveles de severidad. 【F:packages/core/src/telemetry.ts†L1-L27】【F:packages/plugin-voice/src/matchUtterance.ts†L149-L161】【F:packages/core/src/lexicon.ts†L31-L118】
11. **Seguridad** — ✅ Confirmaciones y políticas de permisos, validadores en specs y guardas Vue. 【F:packages/core/src/index.ts†L25-L78】【F:packages/core/src/types.ts†L103-L205】【F:packages/plugin-voice/src/index.ts†L233-L247】【F:packages/vue/src/index.ts†L148-L263】
12. **Rendimiento** — ⚠️ Hay caches fonéticos (`Map`) y límites de candidatos, pero no existen métricas ni budgets de bundle/latencia. 【F:packages/plugin-fuzzy/src/fuzzy.ts†L25-L105】【F:packages/plugin-voice/src/matchUtterance.ts†L30-L147】
13. **Calidad** — ❌ Pruebas sólo en fuzzy/voice; core/vue devuelven `(todo)` y no hay coverage gating. 【F:packages/core/package.json†L73-L78】【F:packages/vue/package.json†L25-L31】【F:packages/plugin-voice/test/matchUtterance.spec.mjs†L1-L107】【F:packages/plugin-fuzzy/test/fuzzy.spec.mjs†L1-L139】
14. **Compatibilidad** — ⚠️ ESM-only (salvo DOM), dependencias a `document/window` sin feature checks; SSR requiere adaptadores manuales. 【F:packages/core/src/index.ts†L18-L23】【F:packages/dom/src/indexer.ts†L16-L179】【F:packages/plugin-voice/src/index.ts†L48-L399】

## Riesgos / Deuda técnica y quick wins
- Normalizar devtools: añadir `tsup`/Vite build que emita bundle ESM + tipos para evitar publicar SFC crudas. 【F:packages/devtools-lexicon/package.json†L16-L26】
- Introducir guards condicionales (o exportar helpers no-DOM) en `Nura.start` y `DOMIndexer` para habilitar SSR/edge. 【F:packages/core/src/index.ts†L18-L23】【F:packages/dom/src/indexer.ts†L16-L179】
- Formalizar suite de pruebas para `@nura/core`/`@nura/vue`; reutilizar fixtures de fuzzy/voice y añadir coverage threshold en CI. 【F:packages/core/package.json†L73-L78】【F:packages/vue/package.json†L25-L31】【F:.github/workflows/ci.yml†L19-L27】
- Añadir size/latency budgets (por ejemplo `size-limit`, métricas de ranking) y telemetría persistente para evaluar pipeline de intents en producción. 【F:packages/plugin-voice/src/matchUtterance.ts†L30-L161】【F:packages/core/src/lexicon.ts†L19-L119】
