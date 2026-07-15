# Nura.js production-hardening audit

Audit date: **2026-07-15**  
Target branch: `agent/production-hardening-agent-bridge`

## Executive assessment

Nura has a differentiated technical core: typed application actions, framework adapters, multilingual intent utilities, permissions, approvals, voice, and semantic DOM indexing. Before this hardening work, several runtime details contradicted the repository's production-readiness claims. This branch closes the most dangerous local-runtime gaps and adds a provider-neutral agent interface, but the project should remain labeled **Developer Preview** until the distributed infrastructure and end-to-end release criteria below are complete.

## Critical findings corrected

1. **Modern authorization bypass** — `target` was not consistently resolved as the permission scope.
2. **Adapter execution bypass** — registered handlers could execute outside the central policy boundary.
3. **Unsafe unattended confirmation** — server-side confirmation defaulted to approval.
4. **SSR crashes** — runtime and DOM constructors accessed browser globals unconditionally.
5. **Incomplete dynamic policies** — permission conditions were not evaluated in the main runtime path.
6. **Stale semantic DOM state** — rescans generated unstable IDs and removed descendants could remain indexed.
7. **Unsafe selector construction** — scope lookup interpolated arbitrary values into a CSS selector.
8. **Incomplete action vocabulary** — supported actions could be collapsed to `custom`.
9. **No general LLM bridge** — there was no provider-neutral tool contract, bounded UI context, or standard model adapters.
10. **Weak CI gate** — CI did not run package tests or enforce coverage and allowed lockfile drift.
11. **Untrusted HTTP identity** — request bodies could self-assert `roles`, `tenant`, and `user`; approval had no mandatory host authorization.

## Implemented in this branch

- Shared `executeNuraAction` validation, authorization, confirmation, audit, and dispatch boundary.
- Default-deny mode, actor tenant identity, role rules, dynamic conditions, and fail-closed confirmation.
- Provider-neutral `NuraAgentBridge`.
- OpenAI Responses, OpenAI Chat Completions, Anthropic, MCP, generic, and custom adapters.
- Opt-in agent exposure with allowlist and predicate alternatives.
- Bounded semantic UI context and secret/prototype-key redaction.
- Authenticated HTTP boundary with trusted identity replacement and explicit approval authorization.
- SSR-safe runtime, scanner, and indexer.
- Stable DOM IDs, root indexing, stale-subtree removal, verb deduplication, and safe lookups.
- 100% line, function, and branch coverage for critical runtime surfaces.
- Node.js 18.18, 20, 22, and 24 CI matrix with frozen lockfile.
- HTTP transport hardened with mandatory authentication by default, trusted tenant/role context, explicit read/approval authorization, bounded identity metadata, CORS allowlists, stable 400/413 body errors, and scoped idempotency/rate-limit keys.
- CodeQL, dependency review, Dependabot, PR security checklist, and release changeset.
- Professional positioning with explicit production boundaries.
- Next.js restored to the lockfile-compatible `15.2.4` version instead of the floating `latest` tag.

## Locally verified

- Core critical suite: **21 passing tests** with 100% lines/functions/branches for the agent bridge, runtime, and permission evaluator.
- DOM critical suite: **8 passing tests** with 100% lines/functions/branches for the indexer, scanner, and verb parser.
- HTTP security suite: **7 passing tests** with 100% lines/functions/branches for authentication, authorization, trusted context, identity normalization, and idempotency/rate-limit key scoping.
- Modified core, DOM, and HTTP transport sources pass strict TypeScript compilation in the focused audit harness.

Pull-request CI is the authoritative full-monorepo verification because this audit environment cannot install and execute the complete remote workspace dependency graph.

## P0 before a production 1.0

- Durable PostgreSQL/Redis stores for intents, approvals, idempotency, leases, and distributed rate limits.
- Trusted HTTP authentication and tenant isolation with replay protection.
- OpenTelemetry traces, metrics, structured audit sinks, and operational dashboards.
- Contract and E2E tests across all UI adapters and SSR frameworks.
- Load, soak, concurrency, failover, latency, memory, and bundle-size tests.
- Pin the remaining floating dependencies and use reviewed dependency upgrades.
- Signed releases, npm provenance, SBOM, and artifact attestation.
- External application-security review and documented threat model.

## Presentation guidance

Position Nura as:

> **The typed action and context runtime that makes existing web applications safely controllable by any AI agent.**

Do not claim global-scale production readiness yet. Demonstrate one real application where the same action is triggered through UI, voice, OpenAI, Anthropic, and MCP while Nura enforces one role/tenant/approval boundary and returns an auditable result.
