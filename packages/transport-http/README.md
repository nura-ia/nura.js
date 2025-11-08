# @nurajs/transport-http

Expose the Nura intent service over hardened HTTP endpoints with JSON-only enforcement, idempotency, and rate limiting.

## Installation

```bash
pnpm add @nurajs/transport-http
```

## Usage Example

```ts
import express from 'express'
import { registerType } from '@nurajs/intents'
import { buildRouter } from '@nurajs/transport-http'

registerType({
  type: 'orders.create',
  schema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } }
})

const app = express()
app.use(buildRouter({
  cors: { origins: ['https://yourapp.com'] },
  limits: { body: '64kb' },
  rateLimit: { windowMs: 60_000, max: 60 }
}))
```

See the [module docs](../../docs/modules/transport-http.md) for endpoint details.
