# Nura.js — The Typed Agent–UI Runtime

[![CI](https://github.com/nura-ia/nura.js/actions/workflows/ci.yml/badge.svg)](https://github.com/nura-ia/nura.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@nura-js/core.svg?label=%40nura-js%2Fcore)](https://www.npmjs.com/package/@nura-js/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Nura.js makes existing web applications safely controllable by AI agents, LLM tool calls, voice, and normal UI events.** It converts application capabilities into typed actions, applies one policy boundary, and exposes a bounded semantic view of the current interface without giving a model unrestricted DOM access.

> The model may propose an action. The application remains in control of whether and how it runs.

## Status

Nura.js is in **Developer Preview**. The agent bridge, runtime authorization, permission evaluator, semantic DOM, and HTTP security modules have enforced 100% line, function, and branch coverage. This does not mean that the entire monorepo has 100% coverage or that the bundled in-memory services are ready for a globally distributed production deployment.

See [Production readiness](./docs/internals/production-readiness.md) for the implemented guarantees and remaining release work.

## Why Nura

- **One execution boundary** — UI events, voice commands, MCP calls, and LLM tools can use the same validation, authorization, confirmation, audit, and telemetry path.
- **Provider-neutral** — connect OpenAI Responses, OpenAI Chat Completions, Anthropic, MCP, or a custom agent protocol.
- **Context-aware** — give agents a compact, sanitized semantic snapshot instead of raw DOM nodes or uncontrolled browser automation.
- **Framework-agnostic** — use the same action runtime with React, Vue, Svelte, or DOM-first applications.
- **Secure defaults** — agent actions are opt-in, production policies can default-deny, server confirmations fail closed, HTTP identity is trusted only from the host, and secret-like fields are redacted.
- **Multilingual** — locale-aware lexicons, numerals, synonyms, fuzzy matching, wake words, and voice utilities remain modular.

## Architecture

```text
AI agent / LLM / voice / UI event
                 │
                 ▼
       Provider adapter or client
                 │
                 ▼
        Nura typed action runtime
        ├─ payload validation
        ├─ roles and conditions
        ├─ confirmation / approval
        ├─ audit and telemetry
        └─ deterministic dispatch
                 │
                 ▼
       React / Vue / Svelte / DOM
```

| Package | Responsibility |
| --- | --- |
| `@nura-js/core` | Typed actions, permissions, agent bridge, context, i18n, lexicon, and telemetry. |
| `@nura-js/intents` | Intent validation, approvals, execution, and audit contracts. |
| `@nura-js/client` | Browser and hybrid client for intent dispatch. |
| `@nura-js/react` | React providers, hooks, and semantic components. |
| `@nura-js/vue` | Vue plugin, composables, and directives. |
| `@nura-js/svelte` | Svelte stores, actions, and components. |
| `@nura-js/transport-http` | Authenticated, policy-aware HTTP transport for server-side intent flows. |
| `@nura-js/dom` | SSR-safe semantic DOM scanning and indexing. |
| `@nura-js/plugin-voice` | Speech, wake-word, and locale-aware voice integration. |
| `@nura-js/plugin-fuzzy` | Edit-distance and phonetic matching utilities. |

## Install

```bash
pnpm add @nura-js/core

# Choose the UI integrations needed by the application.
pnpm add @nura-js/dom @nura-js/react
# pnpm add @nura-js/vue
# pnpm add @nura-js/svelte

# Optional server-side intent workflow.
pnpm add @nura-js/intents @nura-js/transport-http @nura-js/client
```

## Define a protected action

```ts
import { createRegistry, defineActionSpec } from '@nura-js/core'

export const registry = createRegistry({
  config: {
    app: { id: 'orders-app', locale: 'en-US' },
    defaultPolicy: 'deny',
    actor: () => ({
      id: currentUser.id,
      tenant: currentTenant.id,
      roles: currentUser.roles,
      via: 'user',
    }),
  },
  permissions: {
    scopes: {
      orders: {
        open: { policy: 'allow', roles: ['support', 'admin'] },
      },
    },
  },
  specs: [
    defineActionSpec({
      name: 'open_orders',
      type: 'open',
      target: 'orders',
      phrases: { 'en-US': { canonical: ['open orders'] } },
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['today', 'overdue', 'all'] },
        },
        additionalProperties: false,
      },
      validate: (payload) =>
        payload?.filter === undefined ||
        ['today', 'overdue', 'all'].includes(String(payload.filter)),
      meta: {
        agent: true,
        desc: 'Open the orders workspace with an optional filter',
      },
    }),
  ],
  routes: {
    'open::orders': (payload) => {
      router.navigate(`/orders?filter=${payload?.filter ?? 'all'}`)
      return { ok: true }
    },
  },
})
```

`meta.agent: true` exposes the action through the agent bridge. Unmarked actions remain private to the host application.

## Connect any LLM or agent

Nura does not own model credentials, prompts, networking, or conversation state. The host sends provider-formatted tools and sanitized context to its chosen model, then routes returned tool calls through Nura.

```ts
import {
  Nura,
  createAgentBridge,
  createUiContext,
  openAIResponsesAgentAdapter,
} from '@nura-js/core'
import { DOMIndexer } from '@nura-js/dom'

const nura = new Nura({ registry })
const indexer = new DOMIndexer()

const bridge = createAgentBridge({
  registry,
  execute: (action) => nura.act(action),
  context: () => ({
    route: window.location.pathname,
    ui: createUiContext(indexer.getAll()),
  }),
})

const tools = bridge.formatTools(openAIResponsesAgentAdapter)
const context = await bridge.serializeContext()
const invocation = await bridge.invoke(toolCall, openAIResponsesAgentAdapter)
```

Built-in adapters:

- `openAIResponsesAgentAdapter`
- `openAIChatCompletionsAgentAdapter`
- `anthropicAgentAdapter`
- `mcpAgentAdapter`
- `genericAgentAdapter`

Implement `NuraAgentAdapter` for AG-UI, Vercel AI SDK, LangGraph, Mastra, internal orchestrators, or future protocols. See the [Agent bridge guide](./docs/guide/agent-bridge.md).

## Security defaults

1. Agent-visible actions are opt-in.
2. Agent execution should use `action => nura.act(action)`, never a raw handler.
3. Production applications should use `defaultPolicy: 'deny'` and explicitly authorize each action.
4. Tool schemas improve model output but are not a security boundary; validate payloads in Nura and again in the domain service.
5. Destructive, financial, privacy-sensitive, or irreversible operations should require explicit approval.
6. Server-side confirmation fails closed unless the host supplies `config.confirm`.
7. UI context excludes text and metadata by default, removes prototype-pollution keys, redacts common secret fields, and enforces depth, string, array, element, and byte limits.
8. Provider credentials and trusted actor roles belong on the server.
9. The HTTP transport requires an authentication callback by default and fails closed for intent reads and approvals unless the host supplies an ownership/approval authorizer.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm test:coverage # Node.js 22+
pnpm smoke
```

CI verifies Node.js 18.18, 20, 22, and 24. The 100% critical gate covers the agent bridge, runtime authorization, permission evaluator, semantic DOM indexer/scanner, action-verb parser, and HTTP authentication/authorization boundary.

## Documentation

- [Getting started](./docs/getting-started.md)
- [Concepts](./docs/guide/concepts.md)
- [Agent bridge](./docs/guide/agent-bridge.md)
- [Architecture](./docs/internals/architecture.md)
- [Production readiness](./docs/internals/production-readiness.md)
- [Roadmap](./docs/community/roadmap.md)
- [API reference](./docs/api/)

## Community and security

- [Issues](https://github.com/nura-ia/nura.js/issues)
- [Repository](https://github.com/nura-ia/nura.js)
- Website: [nura.dev](https://nura.dev)
- Security reports: [security@nura.dev](mailto:security@nura.dev)
- [Security policy](./SECURITY.md)

## License

MIT — see [LICENSE](./LICENSE).
