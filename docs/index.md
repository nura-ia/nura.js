---
title: "Nura.js — The Agent-UI Bridge"
description: "A next-generation framework that synchronizes your AI agents and user interfaces, built for the multimodal web."
---

# ✨ Nura.js — The Agent-UI Bridge

[![npm](https://img.shields.io/npm/v/@nura/core.svg?label=%40nura%2Fcore)](https://www.npmjs.com/package/@nura/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Nura.js** is a next-generation toolkit that brings your **AI agents** and **UI layers** into perfect harmony.
It handles fuzzy and phonetic matching, intent mapping, context flow, and multimodal adapters — empowering your interfaces to *listen, understand, and act*.

> “Create a world where apps feel profoundly human—so present and gentle you could swear they almost breathe.”
> — *Billy Rojas, Creator of Nura.js*

## 🌌 About Nura

Born from the fusion of *nur* (Arabic for light) and *pneuma* (Greek for breath), Nura.js champions interfaces that feel alive. It channels Billy Rojas’s vision into a bridge that spans roots in Costa Rica🇨🇷 and the innovation currents reaching Tatarstan, crafting tools for teams who want agents to feel truly present.

## 🚀 Core Features

- **Intent Engine** — Define, validate, and approve structured intents across agents and services.
- **Wake & Voice Tools** — Strip wake words, parse numerals, and harmonize phonetics for natural conversations.
- **Locale Intelligence** — Handle multilingual synonyms, numerals, and cultural nuances out of the box.
- **Reactive Context** — Persist, confirm, and replay context with lightweight storage primitives.
- **UI Adapters** — Drop-in bridges for React, Vue, and Svelte to sync agent actions with components.

## 🧠 Nura Intents — AI ↔ Backend Bridge

Nura Intents formalizes the IAE lifecycle — **Intent → Approval → Execute** — so agents operate with clear guardrails.

```json
{
  "type": "create_order",
  "payload": {
    "items": ["espresso", "croissant"],
    "customerId": "usr_123",
    "notes": "rush order"
  },
  "metadata": {
    "locale": "en-US",
    "confidence": 0.91
  }
}
```

Model intents with JSON Schema, gate them behind human or policy approvals, and feed deterministic results into your UI dispatcher.

## 🌐 Nura Transport — Secure, Universal Endpoints

- Harden intent ingestion with schema validation on every request.
- Apply adaptive rate limiting tuned for agent bursts and human fallbacks.
- Serialize and normalize JSON responses with locale-aware metadata.

## 🧭 Nura Client — Unified SDK + Dispatcher

The client SDK unifies transport calls, intent status polling, and UI dispatching into one ergonomic API.

```ts
import { NuraClient } from '@nura/client';

const client = new NuraClient({ baseUrl: '/ai' });

client.on('intent', (intent) => {
  console.log('Intent received:', intent.type);
});

await client.dispatch({
  type: 'create_order',
  payload: { items: ['espresso'] },
});
```

## ⚙️ Quick Start

- Requirements: Node.js ≥ 18.18, pnpm ≥ 8.
- Install core + optional plugins:

  ```bash
  pnpm add @nura/core
  pnpm add @nura/plugin-voice @nura/plugin-fuzzy  # optional packages
  pnpm add @nura/react  # or: pnpm add @nura/vue / pnpm add @nura/svelte
  ```

- Monorepo workflow:

  ```bash
  pnpm install
  pnpm dev  # or: npm run dev / yarn dev
  pnpm build  # or: npm run build / yarn build
  ```

## 💡 Minimal Example

```ts
import { stripWake } from '@nura/core/wake';
import { parseNumeral } from '@nura/core/numerals';
import { normalizeSynonyms } from '@nura/core/synonyms';
import { ContextManager } from '@nura/core/context';

const text = stripWake('ok nora open orders menu', {
  aliases: ['nora', 'lura', 'nula'],
  minConfidence: 0.7,
});
// → "open orders menu"

const id = parseNumeral('quince', 'es'); // → 15
const normalized = normalizeSynonyms('abre el menú de pedidos', 'es');
// → normalizes "pedidos" to "órdenes" per locale dictionary

const ctx = new ContextManager();
ctx.save({ type: 'delete', target: 'order', payload: { id } });
const next = ctx.maybeConfirm('sí, elimínala');
// → { type: 'delete', target: 'order', payload: { id: 15 } }
```

## 🧩 Adapters Matrix

| Adapter | Package | Quick usage |
| --- | --- | --- |
| React | `@nura/react` | ```tsx
import { NuraProvider, useNuraCommand } from '@nura/react';

export function App() {
  useNuraCommand('open-cart', ({ context }) => {
    console.log('Opening cart for', context?.userId);
  });
  return (
    <NuraProvider>
      <button data-nura-command="open-cart">Open cart</button>
    </NuraProvider>
  );
}
``` |
| Vue 3 | `@nura/vue` | ```vue
<script setup lang="ts">
import { NuraProvider } from '@nura/vue';
</script>

<template>
  <NuraProvider>
    <button data-nura-command="open-cart">Open cart</button>
  </NuraProvider>
</template>
``` |
| Svelte | `@nura/svelte` | ```svelte
<script lang="ts">
  import { NuraProvider } from '@nura/svelte';
</script>

<NuraProvider>
  <button data-nura-command="open-cart">Open cart</button>
</NuraProvider>
``` |

## 🧱 Repository Structure

```
apps/
packages/core
packages/intents
packages/transport-*
packages/client
packages/react | packages/vue | packages/svelte
scripts/
```

## 🧪 Verification & Testing

Run the release verification pipeline before shipping:

```bash
pnpm run verify:release
```

## 🧰 Troubleshooting

| Issue | Fix |
| --- | --- |
| Node version mismatch | Use `corepack enable` and `corepack use pnpm@8`, ensure Node.js ≥ 18.18. |
| Permission denied on scripts | Run `chmod +x scripts/*.mjs` before executing tooling. |
| MCP transport blocked | Allow outbound requests to your MCP endpoint (e.g., enable localhost rules in your firewall). |

## 🤝 Contributing

We welcome contributions! Read the [Contributing Guide](../CONTRIBUTING.md), follow Conventional Commits (e.g., `feat: add approval policy`), and use the helper workflow:

```bash
pnpm -w run typecheck
pnpm -w run build
pnpm run smoke
pnpm run verify:release
```

## 🔒 Security

Report vulnerabilities privately to [security@nura.dev](mailto:security@nura.dev).

## 🪪 License

Released under the [MIT License](../LICENSE).

## 🧭 Vision

Nura.js is not just a framework; it’s the connective tissue for conversational, multimodal, and living software.

## 🌅 Manifesto

Let agents whisper and interfaces breathe.
Let context flow like light through glass.
**"Create a world where apps feel profoundly human—so present and gentle you could swear they almost breathe."**

## 🌠 Stay Connected

- Discord: [#](#)
- GitHub: [https://github.com/nura-ia/nurajs](https://github.com/nura-ia/nurajs)
- X / Twitter: [#](#)
- Website: [https://nura.dev](https://nura.dev)

---
Crafted by Billy Rojas • light (nur) • Costa Rica🇨🇷
