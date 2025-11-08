# AI intents

This recipe ties together [`@nurajs/intents`](../modules/intents.md), [`@nurajs/transport-http`](../modules/transport-http.md), and [`@nurajs/client`](../modules/client.md) to deliver AI-driven UI reactions.

## Common intents
- `orders.create` – launch a creation modal, collect payload, confirm execution
- `orders.delete` – request approval, render destructive confirmation, emit toast
- `inventory.add` – append catalog items and broadcast success feedback

## UI reactions
- `ui.open` – open modals, drawers, or deep links with `uiHint.target`
- `ui.toast` – route the payload to toast notifications with status variants
- `ui.navigate` – change routes based on intent context (tenant, locale, or id)

## Multi-tenant notes
- Gate tenant access with `policy.allowTenants` or custom predicates
- Persist tenant-scoped audit logs via the `ConsoleAuditLogger` interface
- Combine tenant id with IP address for the rate limiter key to prevent bleed-over
