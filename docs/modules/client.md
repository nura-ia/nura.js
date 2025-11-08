# @nurajs/client
**Purpose:** Provide an agnostic way to talk to Nura and react to UI-layer outcomes.

## API
- `new AiClient(baseUrl)`
  - `createIntent({ type, payload })`
  - `approveIntent(id)`
  - `getIntent(id)`
  - `getIntentResult(id)`
- `new UiDispatcher()`
  - `register(uiType, handler)`
  - `dispatch(result)`

## Example
```ts
const c = new AiClient('/api/ai')
const d = new UiDispatcher()
d.register('ui.open', (_, hint) => openModal(hint?.target))

const { id } = await c.createIntent({ type:'orders.delete', payload:{ id:'o-15' } })
await c.approveIntent(id)
d.dispatch(await c.getIntentResult(id))
```
