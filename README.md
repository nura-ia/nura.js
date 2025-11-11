# Nura.js — The Agent-UI Bridge

[![npm](https://img.shields.io/npm/v/@nura-js/core.svg?label=%40nura-js%2Fcore)](https://www.npmjs.com/package/@nura-js/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Nura.js** harmonizes AI agents and UI layers so teams can build interfaces that listen, understand, and act. Born from the ideals of *nur* (light) and *pneuma* (breath), it carries Billy Rojas’s vision of living, conversational software.

> “Create a world where apps feel profoundly human—so present and gentle you could swear they almost breathe.”

## Core Features

- **Intent Engine** — Define, validate, and approve structured intents across agents and services.
- **Wake & Voice Tools** — Strip wake words, parse numerals, and harmonize phonetics for natural conversations.
- **Locale Intelligence** — Handle multilingual synonyms, numerals, and cultural nuances out of the box.
- **Reactive Context** — Persist, confirm, and replay context with lightweight storage primitives.
- **UI Adapters** — Drop-in bridges for React, Vue, and Svelte to sync agent actions with components.

## Quick Start

Requirements: Node.js ≥ 18.18, pnpm ≥ 8.

```bash
pnpm add @nura-js/core
pnpm add @nura-js/plugin-voice @nura-js/plugin-fuzzy  # optional packages
pnpm add @nura-js/react  # or: pnpm add @nura-js/vue / pnpm add @nura-js/svelte
```

If you cloned the monorepo:

```bash
pnpm install
pnpm dev  # or: npm run dev / yarn dev
pnpm build  # or: npm run build / yarn build
```

## Minimal Example

```ts
import { stripWake } from '@nura-js/core/wake';
import { parseNumeral } from '@nura-js/core/numerals';
import { normalizeSynonyms } from '@nura-js/core/synonyms';
import { ContextManager } from '@nura-js/core/context';

const text = stripWake('ok nora open orders menu', {
  aliases: ['nora', 'lura', 'nula'],
  minConfidence: 0.7,
});
// → "open orders menu"

const id = parseNumeral('fifteen', 'en'); // → 15
const normalized = normalizeSynonyms('open the orders menu', 'en');
// → normalizes synonyms per locale dictionary

const ctx = new ContextManager();
ctx.save({ type: 'delete', target: 'order', payload: { id } });
const next = ctx.maybeConfirm('yes, delete it');
// → { type: 'delete', target: 'order', payload: { id: 15 } }
```

## Modules

- **@nura-js/core** — Wake helpers, numerals, synonyms, and context manager.
- **@nura-js/intents** — Intent → Approval → Execute flows with JSON Schema validation.
- **@nura-js/transport-http** — Secure HTTP surface with rate limiting and hardened endpoints.
- **@nura-js/client** — Unified SDK + dispatcher for UI reactions.
- **@nura-js/react | @nura-js/vue | @nura-js/svelte** — Framework adapters tuned for conversational UX.

## Docs & Community

- Documentation: [docs/index.md](./docs/index.md)
- Discord: [#](#)
- GitHub: [https://github.com/nura-ia/nurajs](https://github.com/nura-ia/nurajs)
- X / Twitter: [#](#)
- Website: [https://nura.dev](https://nura.dev)

## Security & License

- Report vulnerabilities: [security@nura.dev](mailto:security@nura.dev)
- License: [MIT](./LICENSE)

**"Create a world where apps feel profoundly human—so present and gentle you could swear they almost breathe."**
