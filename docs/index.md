---
title: "Nura.js — The Typed Agent–UI Runtime"
description: "A typed and policy-aware runtime for connecting AI agents, LLM tools, voice, and existing web interfaces."
---

# Nura.js — The Typed Agent–UI Runtime

Nura.js makes existing web applications safely controllable by AI agents, LLM tool calls, voice, and normal UI events.

It converts application capabilities into typed actions, provides a bounded semantic representation of the active interface, and routes execution through deterministic validation, permissions, confirmation, audit, and telemetry.

> The model may propose an action. The application remains in control of whether and how it runs.

## Developer Preview

Nura.js is currently in Developer Preview. Critical agent, authorization, semantic DOM, and HTTP security modules have enforced 100% line, function, and branch coverage. Production deployments still need durable storage, distributed controls, trusted identity, and an observability backend.

## Core capabilities

- Provider-neutral tools for OpenAI Responses, OpenAI Chat Completions, Anthropic, MCP, and custom agents.
- Opt-in exposure of application actions to models.
- Shared authorization for agent calls and framework adapter execution.
- Role, condition, deny, and confirmation policies.
- Fail-closed server-side confirmation.
- Authenticated HTTP intents with trusted identity and explicit approval authorization.
- SSR-safe semantic DOM scanning.
- Sanitized, size-bounded UI context without raw DOM serialization.
- React, Vue, Svelte, and DOM-first integrations.
- Multilingual lexicon, fuzzy matching, wake-word, numeral, and voice utilities.
- Intent → Approval → Execute workflows for server operations.

## Install

```bash
pnpm add @nura-js/core
pnpm add @nura-js/dom @nura-js/react
```

Choose `@nura-js/vue` or `@nura-js/svelte` where appropriate. Add `@nura-js/intents`, `@nura-js/transport-http`, and `@nura-js/client` for server-side intent workflows.

## Define an agent-visible action

```ts
import { createRegistry, defineActionSpec } from '@nura-js/core'

export const registry = createRegistry({
  config: {
    app: { id: 'orders', locale: 'en-US' },
    defaultPolicy: 'deny',
  },
  permissions: {
    scopes: {
      orders: {
        open: { policy: 'allow' },
      },
    },
  },
  specs: [
    defineActionSpec({
      name: 'open_orders',
      type: 'open',
      target: 'orders',
      phrases: { 'en-US': { canonical: ['open orders'] } },
      meta: {
        agent: true,
        desc: 'Open the orders workspace',
      },
    }),
  ],
})
```

`meta.agent: true` exposes the action to the agent bridge. Actions are private to the host application by default.

## Connect an agent

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

Nura does not own model credentials or conversation state. The host sends `tools` and `context` to the selected provider, then passes returned tool calls to `bridge.invoke`.

## Security model

- Treat tool calls and model output as untrusted.
- Use `defaultPolicy: 'deny'` in production.
- Validate sensitive payloads in the action spec and domain service.
- Execute tools through `Nura.act`.
- Require human approval for destructive, financial, or privacy-sensitive operations.
- Keep model credentials and trusted actor roles on the server.
- Enable UI text or metadata only when required and classified for model use.

## Learn more

- [Getting started](./getting-started.md)
- [Concepts](./guide/concepts.md)
- [Agent bridge](./guide/agent-bridge.md)
- [Architecture](./internals/architecture.md)
- [Production readiness](./internals/production-readiness.md)
- [Roadmap](./community/roadmap.md)
- [API reference](./api/)

## Contributing

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm test:coverage # Node.js 22+
pnpm smoke
```

Report security issues privately to [security@nura.dev](mailto:security@nura.dev).

Nura.js is released under the [MIT License](../LICENSE).
