# Nura.js — Interfaces that breathe

[![npm](https://img.shields.io/npm/v/@nura-js/core.svg?label=%40nura-js%2Fcore)](https://www.npmjs.com/package/@nura-js/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-nura.dev-blueviolet)](https://nura.dev)

Build products where AI agents and people move in step. **Nura.js** blends *nur* (light) and *pneuma* (breath) so intent engines, UI adapters, and transport all feel like one orchestration layer.

> “Create a world where apps feel profoundly human—so present and gentle you could swear they almost breathe.”

## ✨ Highlights at a glance

| Capability | Why it matters |
| --- | --- |
| **Agent-native core** | Deterministic intent execution with audits, policies, and approvals baked in. |
| **UI adapters you already know** | React, Vue, Svelte, and DOM integrations ship with hooks, telemetry, and stores. |
| **Multilingual & fuzzy** | Wake words, numerals, and lexicon tooling keep speech and text in sync. |
| **Production guardrails** | Rate limiting, retries, and observability for regulated environments. |

## 🚀 Get moving quickly

1. **Install** the packages that match your stack:
   ```bash
   pnpm add @nura-js/core @nura-js/intents @nura-js/client
   pnpm add @nura-js/react          # swap for @nura-js/vue or @nura-js/svelte
   pnpm add @nura-js/transport-http # opt-in hardened endpoints
   ```
2. **Describe an intent** and wire it to your interface:
   ```ts
   import { createRegistry, defineActionSpec } from '@nura-js/core';

   export const registry = createRegistry({
     config: { app: { id: 'support-hub', locale: 'en-US' } },
     specs: [
       defineActionSpec({
         name: 'open_ticket',
         type: 'open',
         target: 'ticket',
         phrases: { 'en-US': { canonical: ['open my ticket'] } },
       }),
     ],
   });
   ```
3. **Drop the registry into your UI** using the adapter of your choice. Check [`docs/getting-started.md`](./docs/getting-started.md) for complete walk-throughs.

Prefer a tour instead? Jump straight to the [full documentation](./docs/index.md) for detailed guides, recipes, and architecture notes.

## 🧭 Choose your path

- **Evaluate quickly** — Start with the [Quickstart guide](./docs/getting-started.md) and clone examples from [`apps/`](./apps).
- **Design intent systems** — Explore the [Intents module](./docs/modules/intents.md) and [policy recipes](./docs/recipes/policies.md).
- **Instrument experiences** — Tap into telemetry events described in [`docs/guide/observability.md`](./docs/guide/observability.md).

## 🛠️ What ships in the box

| Package | Summary |
| --- | --- |
| `@nura-js/core` | Runtime orchestration, permissions, i18n, lexicon, numerals, and wake-word utilities. |
| `@nura-js/intents` | Intent → approval → execution lifecycle with audit trails and human-in-the-loop flows. |
| `@nura-js/client` | Unified SDK for browser, edge, and Node runtimes with dispatcher and event bus. |
| `@nura-js/react` / `@nura-js/vue` / `@nura-js/svelte` | UI bindings with providers, hooks, and stores. |
| `@nura-js/transport-http` | Hardened HTTP endpoints, adaptive rate limiting, and edge-friendly handlers. |
| `@nura-js/plugin-voice` / `@nura-js/plugin-fuzzy` | Linguistic add-ons for speech, numerals, and phonetics. |
| `@nura-js/dom` | DOM indexers and automation helpers for legacy interfaces. |

## 📚 Learn & contribute

- Full docs and architecture references live in [`docs/`](./docs/).
- Shipping something critical? Review [`QUALITY_CHECKLIST.md`](./QUALITY_CHECKLIST.md) and [`SECURITY.md`](./SECURITY.md).
- Track roadmap updates in [`STATUS.md`](./STATUS.md) and design decisions in [`BUILD_NOTES.md`](./BUILD_NOTES.md).

## 🤝 Community

- GitHub: [https://github.com/nura-ia/nurajs](https://github.com/nura-ia/nurajs)
- Issues & bugs: [https://github.com/nura-ia/nurajs/issues](https://github.com/nura-ia/nurajs/issues)
- Official site: [https://nura.dev](https://nura.dev)
- Direct contact: [hola@nura.dev](mailto:hola@nura.dev)
- Security contact: [security@nura.dev](mailto:security@nura.dev)

---

**Let your agents breathe through the interface.**
