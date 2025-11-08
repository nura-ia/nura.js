# MCP Integration in the Nura Demo

This guide explains how the Vue demo connects to Model Context Protocol (MCP) servers through a WebSocket gateway and how to
validate the integration end to end.

## Architecture

```text
┌──────────────┐      wss://<gateway>/mcp       ┌─────────────────────┐
│ Browser      │ ─────────────────────────────► │ WebSocket Gateway   │
│ (Vue + Nura) │ ◄───────────────────────────── │ (MCP proxy)         │
└─────┬────────┘                                └─────────┬───────────┘
      │                                                ┌──▼──────────────┐
      │  window.__nura.act()                          │ MCP Server      │
      └──────────────────────────────┐                │ (filesystem,    │
                                      ▼               │ orders, etc.)  │
                               Nura Registry          └─────────────────┘
```

- The MCP client (`src/nura/mcp/client.ts`) opens the WebSocket connection and exposes utilities to list resources, list tools,
  and execute tools.
- `src/nura/mcp/registry.ts` maintains the allowlist mapping between Nura intents and MCP tools.
- `src/nura/bootstrap.ts` intercepts `nura.act(...)`, attempts to resolve intents via MCP, and falls back to local handlers if the
  gateway fails.
- `App.vue` provides the UI to connect, list resources, and review telemetry.

## Bring-Up Steps

1. Install repository dependencies:
   ```bash
   pnpm install
   ```
2. Start the Vue demo:
   ```bash
   pnpm --filter nura-vue-demo dev
   ```
3. Start your MCP server and expose an accessible WebSocket gateway (default `wss://localhost:8787/mcp`).
4. Open the demo and set the **Gateway WS URL** field before connecting.

## Nura ↔ MCP Mappings

| Nura intent (`type::target`) | MCP tool              | Arguments                                           |
| ---------------------------- | --------------------- | --------------------------------------------------- |
| `open::menu:orders`          | `filesystem.readFile` | `{ path: './data/orders.json' }`                    |
| `delete::order`              | `orders.delete`       | `{ id: <numeric id from the payload> }`             |

> Arguments are sanitized before invoking tools. Only tools listed in `NURA_TO_MCP` are callable.

## Telemetry Events

- `mcp.client.connecting` / `mcp.client.connected` / `mcp.client.disconnected`
- `mcp.tool.called { name, args, ms }`
- `mcp.tool.error { name, message }`
- `nura.act.completed { via: 'mcp' | 'local' }`

All events appear in the demo sidebar and are available through `window.__nura.telemetry`.

## Manual Test Checklist

- [ ] **Connection:** enter `wss://localhost:8787/mcp`, click **Connect MCP**, and confirm `mcp.client.connected` telemetry.
- [ ] **Listing:** while connected, run **List resources** and **List tools** without errors; confirm the JSON payload renders.
- [ ] **Intent → Tool (open):** select “Orders” and verify `mcp.tool.called` with `filesystem.readFile` and latency data.
- [ ] **Intent → Tool (delete):** trigger “Delete order” with a valid id; confirm `mcp.tool.called` (`orders.delete`) and
        `via: 'mcp'`.
- [ ] **Fallback:** stop the MCP gateway and repeat intents; telemetry should report `via: 'local'` while the UI stays stable.
- [ ] **Latency:** review `ms` values on `mcp.tool.called` (p95 target under 800 ms in local setups).
- [ ] **Security:** issue an unmapped intent; it should be ignored or handled locally without invoking MCP.

## Security Considerations

- Arguments sent to MCP are filtered to allow only primitive values, arrays, and plain objects.
- `NURA_TO_MCP` acts as a strict allowlist. Unlisted tools are never executed.
- Destructive intents (`delete::order`) prompt for confirmation with `window.confirm` before sending.
- Failures emit `mcp.tool.error` and fall back to local handlers to prevent inconsistent states.

## Compatibility with the Existing Demo

When MCP is unavailable, `maybeRunMcp` returns `undefined` and `nura.act` continues with the original logic. Existing components
keep working thanks to the local fallback and the override inside `installNuraBridge`.
