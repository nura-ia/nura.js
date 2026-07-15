# @nura-js/transport-http

Expose the Nura intent service through authenticated, policy-aware Express endpoints with trusted identity, explicit approval authorization, JSON enforcement, identity-scoped rate limiting, and idempotency.

## Installation

```bash
pnpm add @nura-js/transport-http
```

## Usage

```ts
import express from 'express'
import { registerType } from '@nura-js/intents'
import { buildRouter } from '@nura-js/transport-http'

registerType({
  type: 'orders.create',
  schema: {
    type: 'object',
    required: ['id'],
    additionalProperties: false,
    properties: { id: { type: 'string' } },
  },
})

const app = express()
app.use(
  buildRouter({
    security: {
      authenticate: async (request) => {
        const session = await verifySession(request)
        return session
          ? {
              id: session.userId,
              tenant: session.tenantId,
              roles: session.roles,
            }
          : null
      },
      authorize: async ({ operation, principal, intentId }) => {
        if (operation === 'create') return true
        if (operation === 'read') {
          return intentOwnership.canRead({ principal, intentId })
        }
        return principal.roles?.includes('approver') === true
      },
    },
    cors: { origins: ['https://yourapp.com'] },
    limits: { body: '64kb' },
    rateLimit: distributedRateLimiter,
    idempotency: { store: distributedIdempotencyStore, ttlSeconds: 120 },
  }),
)
```

The router does not trust `tenant`, `user`, or `roles` supplied in the request body. It replaces them with values returned by `security.authenticate`. Reading and approving existing intents are denied unless the host explicitly authorizes ownership or approval.

`unsafeAllowAnonymous` is only a local-development escape hatch.

See the [module documentation](../../docs/modules/transport-http.md) for the complete security contract.


Configured browser origins are rejected server-side when an `Origin` header is present; CORS is not a substitute for authentication or CSRF-safe credential design.
