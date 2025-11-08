# Architecture Overview

Nura.js is a modular framework that layers semantic intelligence on top of modern web applications. This document covers the core building blocks and how they interact.

## Core Principles

1. **Semantic First** – UI intent is expressed through structured metadata to empower AI agents and assistive tech.
2. **Composable Packages** – Each capability lives in its own package and can be adopted incrementally.
3. **Type Safety** – Strict TypeScript typing drives DX and runtime confidence.
4. **Framework Neutral** – Core logic stays DOM-oriented while adapters connect to specific ecosystems.

## Package Map

- **@nura/core** – Command registry, lexicon model, context management, and intent resolution.
- **@nura/dom** – DOM indexer/scanner that keeps the semantic graph in sync with rendered elements.
- **@nura/react / @nura/vue / @nura/svelte** – Framework bindings that expose hooks, composables, and actions.
- **@nura/plugin-voice** – Speech recognition and synthesis helpers that bridge voice input with commands.
- **@nura/devtools-lexicon** – Developer tooling (overlays, inspectors, lexicon visualizers).

## Flows

### Intent Lifecycle

1. **Lexicon authoring** – Define intents, slots, and synonyms in the lexicon.
2. **Rendering** – Components annotate interactive elements with Nura data attributes.
3. **Observation** – The DOM package indexes elements and attaches metadata to the runtime graph.
4. **Resolution** – An adapter (React/Vue/Svelte) wires UI events or agent requests into the core registry.
5. **Execution** – Command handlers run with typed context, returning structured responses for agents.

### Internationalization (i18n)

- Lexicon entries support locale-specific phrasing.
- Intent matching uses locale-aware tokenization and fuzzy matching (roadmap item for enhanced scoring).
- Packages share utility layers for locale negotiation and fallback.

### Plugin System

- Voice plugin hooks into the core registry via a pluggable event bus.
- Additional plugins can subscribe to lifecycle events (e.g., logging, analytics) without mutating core state.

## Development Tooling

- **Devtools overlay** renders semantic boundaries and highlights missing metadata.
- **ADR process** captures architectural decisions (`docs/adr/`).
- **Typedoc** (optional) produces API docs as part of the release workflow.

## Data Contracts

- `NActionSpec` – describes intents, slots, locales, and metadata exposed to adapters.
- `NContext` – runtime context containing the registry, i18n helpers, and DOM selectors.
- `NResult` – normalized output returned after executing an action.

## Extensibility

- Framework adapters share common abstractions for bridging events through hooks (`useNuraAction`), directives (`v-nu-act`),
  and Svelte actions (`nuraAction`).
- Third-party integrations can listen to command lifecycle events, augment lexicons, or extend the DOM indexer.

## Deployment Considerations

- All packages ship as ESM; bundlers should target ES2020 or later.
- No external services are required; integrations like analytics are optional.
- Security-sensitive features rely on host apps to enforce authentication/authorization.

For more detailed package APIs, refer to the forthcoming Typedoc output (`docs/api/`) and the source code under `packages/`.
