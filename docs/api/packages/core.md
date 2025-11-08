# @nura/core

> Core runtime for building AI-friendly command layers with Nura.js.

## Installation

```bash
pnpm add @nura/core
# or
npm install @nura/core
```

## Quick Start

```ts
import { Nura, createRegistry } from '@nura/core'

const registry = createRegistry({
  config: {
    app: { id: 'demo-app' },
    actor: () => ({ id: 'user-123', roles: ['user'] }),
  },
})

const nura = new Nura({ registry })

await nura.act({
  type: 'open',
  target: 'cart',
  payload: { mode: 'drawer' },
})
```

## Public API

### `createRegistry(options)`

Creates an `NRegistry` instance with action dispatching, permission checks, i18n,
telemetry, and lexicon helpers.

```ts
const registry = createRegistry({
  config: {
    app: { id: 'demo-app', locale: 'en-US' },
    resolveScope: (action) => action.target,
  },
  specs: [
    {
      name: 'open-cart',
      type: 'open',
      target: 'cart',
      phrases: {
        'en-US': { canonical: ['open the cart'] },
      },
    },
  ],
})
```

#### Options

- `config`: Partial `NConfig` describing the host application (actor factory,
  capabilities, confirmation override, scope resolution).
- `permissions`: Pre-seeded permission matrix for the registry.
- `actionCatalog`: Seeded action catalog implementation, defaults to
  `createActionCatalog()`.
- `routes`: Map of legacy action verbs to handler functions.
- `specs`: Array of `NActionSpec` for semantic command derivation.
- `i18n`: Subset of `NI18nConfig` to seed bundles and detection logic.
- `seedLexicon`: Locale-specific term mappings for the built-in lexicon.

### `new Nura({ registry })`

The façade for executing actions while enforcing permission rules and emitting
telemetry events. Provides:

- `start()` – Idempotent initialization hook that emits a global
  `nura:started` event for host environments.
- `act(action)` – Runs an action via the registry dispatcher and returns an
  `NResult` indicating success/failure.

### Helpers

- `createActionCatalog(initialHandlers?, specs?)`
- `defineActionSpec(spec)` – identity helper for spec authoring.
- `createI18n(config)` – strict locale store with telemetry hooks.
- `createLexicon(telemetry?)` – locale-aware lexicon with phonetic lookups.
- `createTelemetry()` – fan-out emitter for observability pipelines.

## Configuration & Typings

`tsconfig.build.json` ships strict compiler options with `declarationMap`
outputs. Tree-shakeable ESM bundles are emitted via Rollup, with type definitions
co-located under `dist/`.

## Dependencies

- Internal: `@nura/plugin-fuzzy` (semantic search helpers).
- Peer: none.

## Status

**Experimental.** APIs may evolve prior to v1.0. Track changes in the root
[`CHANGELOG.md`](../../CHANGELOG.md).
