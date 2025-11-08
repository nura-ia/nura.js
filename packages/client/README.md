# @nurajs/client

Interact with the Nura AI intent surface from any UI or automation client.

## Installation

```bash
pnpm add @nurajs/client
```

## Usage Example

```ts
import { AiClient, UiDispatcher } from '@nurajs/client'

const client = new AiClient('https://api.example.com/ai')
const dispatcher = new UiDispatcher()

dispatcher.register('ui.open', (_, hint) => openModal(hint?.target))

const { id } = await client.createIntent({
  type: 'orders.create',
  payload: { id: 'o-88' }
})
await client.approveIntent(id)
dispatcher.dispatch(await client.getIntentResult(id))
```

See [`@nurajs/intents`](../../docs/modules/intents.md) and [`@nurajs/transport-http`](../../docs/modules/transport-http.md) for server-side integration.
