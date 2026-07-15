# @nura-js/transport-http

**Purpose:** expose Nura intents through authenticated, policy-aware HTTP endpoints.

## Endpoints

- `POST /ai/intents` — create an intent.
- `POST /ai/intents/:id/approve` — approve an intent after explicit host authorization.
- `GET /ai/intents/:id` — retrieve status and result.

## Security model

The router is fail-closed. `buildRouter()` requires `security.authenticate`; unauthenticated mode must be enabled explicitly with `unsafeAllowAnonymous` and is intended only for local development.

```ts
import express from 'express'
import { buildRouter } from '@nura-js/transport-http'

const app = express()

app.use(
  buildRouter({
    security: {
      authenticate: async (request) => {
        const session = await verifySession(request)
        if (!session) return null

        return {
          id: session.userId,
          tenant: session.tenantId,
          roles: session.roles,
        }
      },
      authorize: async ({ operation, principal, intentId }) => {
        if (operation === 'create') return true
        if (operation === 'read') {
          return intentOwnership.canRead({ principal, intentId })
        }
        return approvalPolicy.canApprove({ principal, intentId })
      },
    },
    cors: { origins: ['https://yourapp.com'] },
    limits: { body: '64kb' },
    rateLimit: distributedRateLimiter,
    idempotency: {
      store: distributedIdempotencyStore,
      ttlSeconds: 120,
    },
  }),
)
```

### Trusted identity

`tenant`, `user`, and `roles` from the JSON request body are discarded. These values are derived exclusively from the authenticated principal returned by the host.

Read and approval operations fail with `403` unless `security.authorize` explicitly verifies ownership or approval authority. Authentication alone does not grant access to another intent.

### Built-in controls

- Authentication required by default.
- Explicit approval authorization.
- JSON-only requests and a 64 KB default body limit.
- `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- CORS allowlist enforcement for requests that include an Origin header.
- Rate-limit keys bound to operation, trusted tenant, trusted principal, and IP.
- `Idempotency-Key` validation and identity-scoped cache keys.
- Stable 400/413 responses for malformed or oversized JSON.

## Production requirements

The bundled window limiter and in-memory idempotency store are development implementations. Multi-instance deployments must supply atomic distributed implementations. The host is also responsible for token verification, key rotation, tenant membership, audit storage, request deadlines, and replay-resistant credentials.

Do not use:

```ts
buildRouter({ security: { unsafeAllowAnonymous: true } })
```

on an internet-facing environment.
