# @nurajs/intents

Define, validate, and execute AI intents using Nura’s Intent → Approval → Execute (IAE) loop.

## Installation

```bash
pnpm add @nurajs/intents
```

## Quick Start

```ts
import { registerType, createIntent, getIntentResult } from '@nurajs/intents'

registerType({
  type: 'orders.create',
  schema: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
    additionalProperties: false,
  },
  mapper: payload => ({ type: 'ui.open', payload, uiHint: { target: 'orderForm' } })
})

const { id } = await createIntent({ type: 'orders.create', payload: { id: 'o-100' } })
const result = await getIntentResult(id)
```

## Policies

- `requiresApproval` to queue intents pending approval
- `allowTenants` and role-based gates
- `predicate(context)` for custom approvals

See the [module docs](../../docs/modules/intents.md) for the full API.
