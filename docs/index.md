---
title: "Nura.js Documentation Hub"
description: "Deep reference for the Nura.js agent-to-UI framework, covering concepts, architecture, and operational guidance."
---

# Nura.js Documentation Hub

Welcome to the canonical reference for **Nura.js**. These pages dive into the conceptual model, package architecture, and operational guidance required to run agent-driven interfaces in production. If you are looking for a brief overview or marketing narrative, start with the [project README](../README.md); the rest of this site is intentionally detailed and task-focused.

## 1. Orientation

- **New to the framework?** Begin with the [Getting started guide](./getting-started.md) for a tutorial that creates a registry, wires the client SDK, and deploys a transport layer.
- **Need conceptual grounding?** Explore the [Concepts guide](./guide/concepts.md) where intents, approvals, context, and transports are defined precisely.
- **Looking for APIs?** The [API reference](./api/) is generated from source and lists every exported type across packages.
- **Investigating internals?** Architectural decision records and deep dives live under [`./internals/`](./internals/).

## 2. System goals and philosophy

Nura.js was created by Billy Rojas in Costa Rica with the ambition of crafting humane software. The name fuses *nur* (light) and *pneuma* (breath) and drives the following tenets:

1. **Deterministic agency** — Natural language may be fuzzy, but execution must be traceable and auditable.
2. **Layered responsibility** — UI surfaces, transport, intent evaluation, and business execution are decoupled yet observable.
3. **Global readiness** — Locale-aware numerals, wake words, and lexicon management are core features, not extensions.
4. **Operational maturity** — Every feature is judged by its deployability: rate limiting, retries, access policies, and telemetry are first-class citizens.

Keep these principles in mind when designing custom modules or extending packages.

## 3. Architectural overview

The framework is organized into four layers. Each layer maps to multiple packages in the monorepo and can be adopted independently.

1. **Presentation surfaces** — React, Vue, Svelte, Web Components, and raw DOM bindings present intents to users and translate actions back into the runtime. See [`packages/react`](../packages/react/README.md), [`packages/vue`](../packages/vue/README.md), and [`packages/svelte`](../packages/svelte/README.md).
2. **Client runtime** — `@nura-js/client` orchestrates registries, dispatchers, and subscription lifecycles. It exposes hooks/stores to the presentation layer and bridges to transport.
3. **Intent services** — `@nura-js/intents` defines the intent schema, policy engines, approval pipelines, and execution dispatch. It enforces the Intent → Approval → Execute (IAE) contract and writes audit logs.
4. **Transports and integrations** — Packages such as `@nura-js/transport-http`, `@nura-js/dom`, and community connectors expose the runtime beyond the UI, enabling automation, edge functions, or MCP endpoints.

The interaction path is:

```
User request → UI adapter → Client registry → Intent service → Policy / approval → Transport → Downstream system
                                            ↑                 ↓
                                     Context manager   Telemetry + audit
```

Each arrow above corresponds to an observable event. The [observability guide](./guide/observability.md) lists emitted event names, payloads, and tracing best practices.

## 4. Package index

| Layer | Package | Documentation | Notes |
| --- | --- | --- | --- |
| Runtime core | `@nura-js/core` | [Module reference](./modules/core.md) | Configuration loading, permissions, lexicon, numerals, wake word detection. |
| Intent pipeline | `@nura-js/intents` | [Module reference](./modules/intents.md) | Schema validation, approval queues, audit persistence, escalation policies. |
| Client SDK | `@nura-js/client` | [Module reference](./modules/client.md) | Registry wiring, dispatcher lifecycle, shared telemetry bus. |
| UI adapters | `@nura-js/react` / `@nura-js/vue` / `@nura-js/svelte` | React/Vue/Svelte README files | Hooks, stores, SSR support, hydrated command components. |
| Transport | `@nura-js/transport-http` | [Transport guide](./modules/transport-http.md) | Hardened HTTP handlers with tenant-aware rate limiting and signature verification. |
| Linguistics | `@nura-js/plugin-voice`, `@nura-js/plugin-fuzzy` | Package READMEs | Wake word registration, phonetic matching, locale numerals. |
| Automation | `@nura-js/dom` | [Automation guide](./modules/dom.md) | DOM indexing for legacy applications and robotic UI automation. |

A full list of exported components is generated in [`../components.json`](../components.json) after running `pnpm run build`.

## 5. Environment setup

1. Install Node.js ≥ 18.18 and enable `corepack` to access pnpm quickly.
2. Run `corepack use pnpm@8` to align with the repository toolchain.
3. Clone the repository and bootstrap dependencies with `pnpm install` (monorepo aware).
4. Verify that required environment variables are documented in [`packages/*/.env.example`](../packages) files before running sample apps.

Refer to [`BUILD_NOTES.md`](../BUILD_NOTES.md) for historical decisions about tooling upgrades and to [`QUALITY_CHECKLIST.md`](../QUALITY_CHECKLIST.md) for release-readiness expectations.

## 6. Development workflow

The repository uses Turborepo for task orchestration. Common commands:

- `pnpm -w run typecheck` — Ensure TypeScript definitions remain consistent across packages.
- `pnpm -w run lint` — Run ESLint with shared configs located in `tsconfig.eslint.json` and `.eslintrc` files per package.
- `pnpm -w run build` — Emit compiled artifacts and regenerate `components.json`.
- `pnpm run smoke` — Execute end-to-end smoke tests defined in [`scripts/`](../scripts).
- `pnpm run docs` — Generate API docs via TypeDoc when applicable.

CI pipelines expect these commands to pass before merges. See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for branching conventions and commit hygiene (Conventional Commits enforced via `commitlint`).

## 7. Core concepts in depth

### 7.1 Registries and action specs

Registries act as the contract between UI and intent services. They collect `ActionSpec` entries that describe the intent type, target, phrases, and optional validation hooks. Registries should be versioned alongside your UI so that changes to phrases and contexts remain auditable.

A canonical example:

```ts
import { createRegistry, defineActionSpec } from '@nura-js/core';

export const registry = createRegistry({
  config: {
    app: { id: 'orders-app', locale: 'en-US' },
    permissions: { defaultRole: 'agent' },
  },
  specs: [
    defineActionSpec({
      name: 'orders.open',
      type: 'open',
      target: 'orders',
      phrases: {
        'en-US': { canonical: ['open my orders', 'show orders'] },
        'es-CR': { canonical: ['abrir mis órdenes'] },
      },
    }),
  ],
});
```

### 7.2 Approval flows

Intent lifecycles progress through five states: `received`, `classified`, `awaiting_approval`, `executed`, and `archived`. Policies can short-circuit approvals for trusted roles or escalate to human operators. The [policy recipe collection](./recipes/policies.md) provides templates for multi-tenant SaaS, regulated industries, and experimentation environments.

### 7.3 Context management

`@nura-js/core/context` persists the latest confirmed intent and tracks follow-up confirmations. Context stores are scoped per session and should be cleared on logout events. The [conversation guide](./guide/conversation.md) explains how to chain intents, handle clarifications, and surface natural acknowledgments.

### 7.4 Observability

Every transition emits structured telemetry. Subscribe via the event bus exposed by `@nura-js/client`:

```ts
import { useNuraEvents } from '@nura-js/react';

useNuraEvents((event) => {
  if (event.name === 'intent:failed') {
    console.error('Intent failed', event.payload);
  }
});
```

The observability guide documents event names, correlation IDs, and how to connect them to OpenTelemetry or proprietary analytics.

## 8. Deployment considerations

- **Edge runtimes** — `@nura-js/transport-http` is compatible with Vercel Edge Functions and Cloudflare Workers. Ensure you tree-shake unused locales to stay within runtime limits.
- **On-premises environments** — Hardened transports support mutual TLS, signature validation, and scoped access tokens. Review [`docs/recipes/secure-transports.md`](./recipes/secure-transports.md).
- **Versioning** — Packages follow semantic versioning. Coordinate registry updates with client deployments to avoid mismatched intent signatures.
- **Disaster recovery** — Persist audit logs emitted by the intents service; they are designed for replaying pending approvals in case of downtime.

## 9. Testing and verification

Before releasing, validate across layers:

1. Run unit suites in each package (`pnpm --filter <package> test`).
2. Execute cross-package smoke tests (`pnpm run smoke`).
3. Inspect generated docs with `pnpm run docs` to ensure public APIs remain accurate.
4. Review [`QUALITY_CHECKLIST.md`](../QUALITY_CHECKLIST.md) and sign off on the release checklist recorded in [`RELEASING.md`](../RELEASING.md).

## 10. Reference materials

- [Changelog](./changelog) — release history with upgrade notes.
- [Architecture decisions](./adr/) — ADRs capturing design trade-offs.
- [Internals](./internals/) — diagrams, flows, and storage layouts.
- [Support](../SUPPORT.md) — how to request paid assistance.
- [Security policy](../SECURITY.md) — vulnerability disclosure guidelines.

---

For questions, reach the team at [hola@nura.dev](mailto:hola@nura.dev) or open an issue on [GitHub](https://github.com/nura-ia/nurajs/issues). This site will continue to grow with deeper tutorials, protocol specifications, and integration examples.
