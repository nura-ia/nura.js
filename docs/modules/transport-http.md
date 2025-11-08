# @nurajs/transport-http
**Purpose:** A hardened HTTP interface that exposes Nura’s intent surface.

## Endpoints
- `POST /ai/intents` → create a new intent
- `POST /ai/intents/:id/approve` → approve if required
- `GET /ai/intents/:id` → retrieve current status/result

## Security
- CORS allowlist
- JSON-only
- Size limit (default 64KB)
- IP/tenant rate limiting
- Idempotency via `Idempotency-Key`

## Usage
```ts
import { buildRouter } from '@nurajs/transport-http'
export const aiRouter = buildRouter({
  cors: { origins: ['https://yourapp.com'] },
  limits: { body: '64kb' },
  rateLimit: { windowMs: 60_000, max: 60 }
})
```
