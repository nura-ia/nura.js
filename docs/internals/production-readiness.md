# Production readiness

This document separates guarantees implemented in the open-source runtime from infrastructure that a production deployment must supply.

## Implemented guarantees

### Runtime and authorization

- Modern `type/target` actions resolve `target` as their permission scope.
- Legacy actions and framework-adapter execution use the same `Nura.act` authorization path.
- `defaultPolicy: 'deny'` supports least-privilege deployments.
- Role rules, dynamic conditions, explicit deny, and confirmation policies fail closed.
- Server-side confirmation denies the action unless the host configures `config.confirm`.
- Action-spec validators run before authorization and dispatch.
- Authorization decisions emit audit and telemetry information.
- Runtime startup is safe in SSR and non-browser environments.

### Agent bridge

- Provider-neutral canonical tool representation.
- OpenAI Responses, OpenAI Chat Completions, Anthropic, MCP, generic, and custom adapters.
- Agent tools are opt-in by default.
- Model arguments flow through action validation and Nura authorization.
- Context and result data are bounded and sanitized.
- Prototype-pollution keys and common secret keys are removed or redacted.
- Raw DOM nodes are never serialized.

### HTTP boundary

- Router construction requires an authentication function unless local-only anonymous mode is explicitly selected.
- `tenant`, `user`, and `roles` from request JSON are discarded and replaced with trusted principal values.
- Approval requires explicit host authorization and fails closed by default.
- Rate-limit and idempotency scopes include trusted tenant and principal identity.
- Idempotency keys are length- and character-bounded.
- Malformed JSON and oversized bodies return stable 400/413 client errors rather than internal errors.
- Security-critical HTTP helpers have enforced 100% line, function, and branch coverage.
- The bundled window limiter and get/set idempotency flow remain single-process conveniences; global deployments need atomic distributed implementations.

### Semantic UI index

- SSR-safe scanner and indexer.
- Root elements and descendants are indexed consistently.
- Generated IDs remain stable across rescans.
- Rescans remove stale descendants.
- Mutation removal clears complete subtrees.
- Scope lookup does not interpolate user-controlled values into CSS selectors.
- All supported Nura action types are preserved rather than collapsed to `custom`.

### Quality gates

CI runs type checking, builds, package tests, and smoke tests on Node.js 18.18, 20, 22, and 24. Node.js 22 enforces 100% line, function, and branch coverage for the critical agent, authorization, semantic DOM, and HTTP security modules.

The 100% gate intentionally does not claim full-monorepo coverage. Framework adapters, the full HTTP router/E2E matrix, devtools, examples, and browser integrations require separate expansion.

## Host responsibilities

### Identity and tenant isolation

The host must authenticate users and agents, derive roles from trusted server state, bind every request to a tenant, and prevent clients from self-asserting privileged identities.

### Durable intent storage

The default intent runtime uses in-memory components for development. Globally distributed deployments need durable implementations for:

- intent records;
- approval queues;
- idempotency keys;
- rate-limit counters;
- audit events;
- retries and dead-letter handling.

A common production design uses PostgreSQL for authoritative records and Redis or another atomic distributed store for short-lived idempotency, leases, and rate-limit state.

### Observability

Production systems should export structured logs, metrics, and traces through OpenTelemetry or an equivalent backend. At minimum, measure:

- tool-call count and error rate;
- permission denial reason;
- approval latency;
- action latency percentiles;
- context byte size;
- unknown-tool and validation-failure rate;
- retries and idempotency hits;
- per-tenant and per-agent quotas.

Never record credentials, cookies, complete prompts, or sensitive payloads by default.

### Scaling and resilience

The runtime and agent bridge are stateless and can be horizontally replicated. Remote transports and intent services must add:

- distributed rate limiting;
- idempotent execution;
- timeouts and cancellation;
- bounded concurrency;
- circuit breakers around model providers and downstream systems;
- region-aware data residency;
- retry policies with jitter;
- load shedding and backpressure.

### Supply chain and releases

This branch adds frozen-lockfile builds, CodeQL, dependency review, and automated dependency updates. Before a stable 1.0 release, also add:

- signed and immutable GitHub releases;
- npm provenance;
- SBOM generation;
- release-artifact smoke tests;
- a documented semantic-versioning and deprecation policy.

## Remaining release work

1. PostgreSQL and Redis intent-store adapters.
2. OpenTelemetry exporter and documented event schema.
3. Contract and E2E suites for React, Vue, Svelte, Next.js, Nuxt, and SvelteKit.
4. Browser compatibility matrix for voice, DOM observation, and accessibility APIs.
5. Load tests and latency, memory, and bundle-size budgets.
6. Security review of HTTP authentication, CSRF, CORS, replay protection, tenant isolation, and abuse controls.
7. Official AG-UI and Vercel AI SDK examples.
8. An MCP server package rather than mapping-only examples.
9. Stable API review, migration guide, and explicit 1.0 exit criteria.
10. Coverage expansion beyond the critical runtime surfaces.
11. Pin the remaining floating root dependencies and refresh them through reviewed dependency PRs.
