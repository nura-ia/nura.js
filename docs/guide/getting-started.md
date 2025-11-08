# Getting Started

Welcome to Nura.js! This guide walks you through installing dependencies, bootstrapping a project, and registering your first agent-friendly command.

## Prerequisites

- Node.js 18.18 or newer
- pnpm 8+ (via Corepack). npm and bun work with equivalent commands.
- TypeScript 5 with `strict` mode enabled

## Install the Core Package

```bash
pnpm add @nura/core
```

Optional packages:

- Voice tools: `pnpm add @nura/plugin-voice`
- Fuzzy helpers: `pnpm add @nura/plugin-fuzzy`
- React adapter: `pnpm add @nura/react`
- Vue adapter: `pnpm add @nura/vue`
- Svelte adapter: `pnpm add @nura/svelte`

## Initialize Nura.js

Create an entry point that sets up the provider for your app. Example using React:

```tsx
import { NuraProvider } from '@nura/react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <NuraProvider>
    <App />
  </NuraProvider>
)
```

## Define Your First Command

Commands connect structured intents to executable logic.

```tsx
import { useNuraCommand } from '@nura/react'

export function CheckoutButton() {
  useNuraCommand('checkout', ({ context }) => {
    console.log('Checking out for user', context.userId)
  })

  return (
    <button data-nura-command="checkout">Checkout</button>
  )
}
```

- `data-nura-command` exposes the action to agents, screen readers, and other tools.
- `useNuraCommand` registers the handler with context-aware metadata.

## Connect AI intents to the UI

Bridge your automation flow with [`@nurajs/intents`](../modules/intents.md), [`@nurajs/transport-http`](../modules/transport-http.md), and [`@nurajs/client`](../modules/client.md).

```ts
// intents/orders.ts
import { registerType } from '@nurajs/intents'

registerType({
  type: 'orders.create',
  schema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  mapper: payload => ({ type: 'ui.open', payload, uiHint: { target: 'orderForm' } })
})
```

```ts
// http/ai.ts
import { buildRouter } from '@nurajs/transport-http'
export const aiRouter = buildRouter({ limits: { body: '64kb' } })
```

```ts
// client
import { AiClient, UiDispatcher } from '@nurajs/client'
const client = new AiClient('/ai')
const dispatcher = new UiDispatcher()

dispatcher.register('ui.open', (_, hint) => openModal(hint?.target))
const { id } = await client.createIntent({ type: 'orders.create', payload: { id: 'o-42' } })
dispatcher.dispatch(await client.getIntentResult(id))
```

## Run Locally

```bash
pnpm install
pnpm dev  # or: npm run dev / yarn dev
```

`pnpm dev` uses TurboRepo to run all active workspaces in watch mode.

## Next Steps

- Explore the [recipes](../tutorials/recipes.md) for slot filling, wake words, and adapters.
- Read the [architecture](../internals/architecture.md) overview to understand the building blocks.
- Track upcoming features on the [roadmap](../community/roadmap.md).
