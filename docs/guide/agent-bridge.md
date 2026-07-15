# Agent bridge

The Nura agent bridge exposes selected application actions as provider-neutral tools, supplies a bounded semantic view of the current UI, and executes every model-selected action through the same runtime policies used by the application.

## Design goals

- Keep Nura independent of any model or agent vendor.
- Treat every tool call and model argument as untrusted input.
- Avoid raw DOM access and uncontrolled browser automation.
- Keep authorization and confirmation deterministic in application code.
- Make tools portable across OpenAI, Anthropic, MCP, and custom frameworks.
- Keep the bridge stateless so it can run in a browser, server, edge-compatible host, or agent gateway.

## Declare an agent-visible action

Agent exposure is opt-in by default.

```ts
import { createRegistry, defineActionSpec } from '@nura-js/core'

export const registry = createRegistry({
  config: {
    app: { id: 'crm', locale: 'en-US' },
    defaultPolicy: 'deny',
  },
  permissions: {
    scopes: {
      customers: {
        open: { roles: ['support', 'admin'] },
      },
    },
  },
  specs: [
    defineActionSpec({
      name: 'open_customer',
      type: 'open',
      target: 'customers',
      phrases: { 'en-US': { canonical: ['open customer'] } },
      entities: [{ name: 'customerId', type: 'string' }],
      validate: (payload) =>
        typeof payload?.customerId === 'string' &&
        payload.customerId.length <= 64,
      meta: {
        agent: true,
        desc: 'Open a customer record by ID',
        requiredEntities: ['customerId'],
      },
    }),
  ],
})
```

Without `meta.agent: true`, the action remains available to the host application but is not listed as an agent tool. The bridge also accepts an explicit `expose` allowlist or predicate.

## Build the bridge

```ts
import { Nura, createAgentBridge } from '@nura-js/core'

const nura = new Nura({ registry })

const bridge = createAgentBridge({
  registry,
  execute: (action) => nura.act(action),
  context: async () => ({
    route: window.location.pathname,
    tenant: currentTenant.id,
  }),
})
```

Always execute through `Nura.act`. Passing a raw dispatcher or domain handler would move the security boundary outside Nura.

## Add semantic UI context

```ts
import { createUiContext } from '@nura-js/core'
import { DOMIndexer } from '@nura-js/dom'

const indexer = new DOMIndexer()

const bridge = createAgentBridge({
  registry,
  execute: (action) => nura.act(action),
  context: () => ({
    route: window.location.pathname,
    ui: createUiContext(indexer.getAll(), {
      maxElements: 100,
      includeText: false,
      includeMetadata: false,
    }),
  }),
  maxContextBytes: 64_000,
  maxArgumentBytes: 64_000,
})
```

The context contains semantic IDs, scopes, supported actions, element tags, accessible labels, and hidden or disabled state. It does not contain raw DOM nodes. Text and metadata are excluded unless explicitly enabled.

The serializer:

- redacts keys resembling authorization, cookies, passwords, secrets, tokens, and API keys;
- removes `__proto__`, `prototype`, and `constructor` keys;
- handles circular references;
- limits depth, array size, string size, element count, context bytes, and tool-argument bytes;
- converts unsupported class instances into inert descriptions.

Applications can provide a custom `transform` function for domain-specific classification and redaction.

## OpenAI Responses

```ts
import { openAIResponsesAgentAdapter } from '@nura-js/core'

const tools = bridge.formatTools(openAIResponsesAgentAdapter)
const context = await bridge.serializeContext()

const response = await openai.responses.create({
  model: process.env.OPENAI_MODEL,
  tools,
  input: [
    {
      role: 'system',
      content: `Current application context: ${context}`,
    },
    { role: 'user', content: userRequest },
  ],
})

for (const item of response.output) {
  if (item.type !== 'function_call') continue
  const invocation = await bridge.invoke(item, openAIResponsesAgentAdapter)
  // Return invocation.result using the provider's tool-result format.
}
```

Nura accepts the Responses tool-call fields `call_id`, `name`, and JSON `arguments`. `openAIChatCompletionsAgentAdapter` supports the nested `function` tool shape.

## Anthropic

```ts
import { anthropicAgentAdapter } from '@nura-js/core'

const tools = bridge.formatTools(anthropicAgentAdapter)
const invocation = await bridge.invoke(toolUseBlock, anthropicAgentAdapter)
```

## MCP

```ts
import { mcpAgentAdapter } from '@nura-js/core'

const tools = bridge.formatTools(mcpAgentAdapter)
const invocation = await bridge.invoke(
  {
    id: request.id,
    params: {
      name: request.params.name,
      arguments: request.params.arguments,
    },
  },
  mcpAgentAdapter,
)
```

The adapter formats Nura actions as MCP-compatible tool definitions. Transport, authentication, sessions, and the MCP server lifecycle remain responsibilities of the host.

## Custom agent framework

```ts
import type { NuraAgentAdapter } from '@nura-js/core'

const adapter: NuraAgentAdapter<MyTool, MyCall> = {
  id: 'my-agent',
  formatTools: (tools) => tools.map(convertTool),
  parseToolCall: (call) => ({
    id: call.requestId,
    name: call.operation,
    arguments: call.input,
  }),
}
```

This is the extension point for AG-UI, Vercel AI SDK, LangGraph, Mastra, internal orchestrators, and future protocols.

## Validation and authorization order

Tool schemas help models produce structured arguments; they are not a security control. The execution sequence is:

1. Resolve only the currently exposed tools.
2. Parse and clean the tool call.
3. Run the action-spec validator.
4. Resolve the permission scope from `target`, legacy `scope`, or `config.resolveScope`.
5. Apply default policy, role rules, and dynamic conditions.
6. Run confirmation or approval. Server-side confirmation fails closed without a configured callback.
7. Dispatch the deterministic application handler.
8. Emit audit and telemetry events.
9. Sanitize result data before returning it to the agent.

## Production checklist

- Use `defaultPolicy: 'deny'`.
- Expose only the minimum set of agent tools.
- Bind actor and tenant identity from trusted server state.
- Validate payloads with domain schemas.
- Require human approval for destructive or financial operations.
- Avoid UI text and metadata unless necessary and classified for model use.
- Keep provider credentials outside the browser.
- Log tool, actor, tenant, decision, duration, and result status—not secret payloads.
- Apply distributed rate limits, atomic idempotency, replay protection, and request deadlines at the server boundary. The bundled HTTP transport provides fail-closed authentication and scoped keys, but global deployments must supply distributed stores.
