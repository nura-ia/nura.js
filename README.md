# Nura.js — The Agent-UI Bridge

[![npm](https://img.shields.io/npm/v/@nura-js/core.svg?label=%40nura-js%2Fcore)](https://www.npmjs.com/package/@nura-js/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Nura.js** harmonizes AI agents and UI layers so teams can build interfaces that listen, understand, and act. Born from the ideals of *nur* (light) and *pneuma* (breath), it carries Billy Rojas's vision of living, conversational software.

> "Create a world where apps feel profoundly human—so present and gentle you could swear they almost breathe."

## Overview

Nura.js is a comprehensive framework for building AI-friendly web applications. It provides a complete ecosystem for processing natural language, managing intents, executing actions, and synchronizing AI agents with UI components across multiple frameworks.

### Architecture

The framework is organized into modular packages that work together:

- **Core Runtime** (`@nura-js/core`) - Foundation for action execution, permissions, i18n, and NLP utilities
- **Intent System** (`@nura-js/intents`) - Structured intent definition, validation, approval workflows, and execution
- **Client SDK** (`@nura-js/client`) - HTTP client and UI dispatcher for intent-based interactions
- **Framework Adapters** (`@nura-js/react`, `@nura-js/vue`, `@nura-js/svelte`) - Framework-specific integrations
- **Transport Layer** (`@nura-js/transport-http`) - Secure HTTP endpoints with rate limiting
- **DOM Utilities** (`@nura-js/dom`) - DOM indexing and scanning for UI automation

## Core Features

### 1. Intent Engine (`@nura-js/intents`)
Complete Intent → Approval → Execute (IAE) workflow with:
- **JSON Schema Validation** - Type-safe intent payloads with Ajv
- **Policy Engine** - Role-based, tenant-based, and custom predicate policies
- **Approval Workflows** - Queue intents for manual approval when required
- **Idempotency** - Safe retry mechanisms with idempotency keys
- **Audit Logging** - Comprehensive logging for all intent operations
- **Rate Limiting** - Built-in protection against abuse

### 2. Wake Word Processing (`@nura-js/core/wake`)
Advanced wake word detection and removal:
- **Fuzzy Matching** - Uses Damerau-Levenshtein and Soundex algorithms
- **Alias Support** - Multiple wake word aliases (e.g., "nora", "lura", "nula")
- **Confidence Scoring** - Configurable minimum confidence thresholds
- **Prefix Handling** - Recognizes "ok", "okay", "okey" prefixes
- **Phonetic Matching** - Soundex-based phonetic similarity

### 3. Natural Language Processing
- **Numeral Parsing** - Converts written numbers ("fifteen" → 15) with locale support
- **Synonym Normalization** - Harmonizes synonyms per locale (e.g., "pedidos" → "ordenes")
- **Locale Detection** - Automatic locale detection from content
- **Entity Parsing** - Boolean, enum, date, number, and range parsing

### 4. Context Management (`@nura-js/core/context`)
Lightweight context persistence for conversational flows:
- **Action Saving** - Store last action for follow-up confirmations
- **Confirmation Detection** - Recognizes confirmation phrases ("yes", "ok", "si", "dale")
- **Context Retrieval** - Retrieve and replay saved actions

### 5. Internationalization (`@nura-js/core/i18n`)
Full i18n support with:
- **Namespace Support** - Organized message bundles (common, actions, ui)
- **Fallback Locales** - Automatic fallback chain resolution
- **Interpolation** - Variable substitution in messages
- **Dynamic Registration** - Runtime message registration

### 6. Lexicon System (`@nura-js/core/lexicon`)
Terminology management:
- **Canonical Forms** - Normalize terms to canonical representations
- **Phonetic Matching** - Phonetic similarity for voice recognition
- **Bulk Operations** - Efficient batch registration
- **Locale-Specific** - Per-locale term dictionaries

### 7. Action System (`@nura-js/core`)
Flexible action execution framework:
- **Action Registry** - Register and dispatch actions
- **Permission System** - Role-based and scope-based permissions
- **Confirmation Hooks** - Optional confirmation prompts
- **Telemetry** - Event emission for monitoring
- **Modern & Legacy APIs** - Support for both modern (`type/target`) and legacy (`verb/scope`) action formats

### 8. Framework Adapters
React, Vue, and Svelte integrations with:
- **Provider Components** - Context providers for registry injection
- **Custom Hooks** - `useNura`, `useNuraAction`, `useNuraPermission`
- **Component Helpers** - `NuraElement`, `NuraButton` for declarative actions
- **Event Handling** - React to registry events in components

## Quick Start

### Requirements

- Node.js ≥ 18.18.0
- pnpm ≥ 8.15.0

### Installation

```bash
# Core package
pnpm add @nura-js/core

# Optional plugins
pnpm add @nura-js/plugin-voice @nura-js/plugin-fuzzy

# Framework adapter (choose one)
pnpm add @nura-js/react
# or
pnpm add @nura-js/vue
# or
pnpm add @nura-js/svelte

# Intent system (for server-side)
pnpm add @nura-js/intents @nura-js/transport-http

# Client SDK (for client-side)
pnpm add @nura-js/client
```

### Development Setup

If you cloned the monorepo:

```bash
# Install dependencies
pnpm install

# Run development mode
pnpm dev

# Build all packages
pnpm build

# Type checking
pnpm typecheck
```

## Usage Examples

### Basic Wake Word Processing

```ts
import { stripWake } from '@nura-js/core/wake';

const text = stripWake('ok nora open orders menu', {
  aliases: ['nora', 'lura', 'nula'],
  minConfidence: 0.7,
});
// → "open orders menu"
```

### Numeral and Synonym Processing

```ts
import { parseNumeral } from '@nura-js/core/numerals';
import { normalizeSynonyms } from '@nura-js/core/synonyms';

const id = parseNumeral('fifteen', 'en'); // → 15
const normalized = normalizeSynonyms('open the orders menu', 'en');
// → normalizes synonyms per locale dictionary
```

### Context Management

```ts
import { ContextManager } from '@nura-js/core/context';

const ctx = new ContextManager();
ctx.save({ type: 'delete', target: 'order', payload: { id: 15 } });
const confirmed = ctx.maybeConfirm('yes, delete it');
// → { type: 'delete', target: 'order', payload: { id: 15 } }
```

### Action Registry and Execution

```ts
import { createRegistry, defineActionSpec, Nura } from '@nura-js/core';

const registry = createRegistry({
  config: {
    app: { id: 'my-app', locale: 'en-US' },
  },
  specs: [
    defineActionSpec({
      name: 'open_orders',
      type: 'open',
      target: 'orders',
      phrases: {
        'en-US': { canonical: ['open orders'] },
      },
    }),
  ],
});

const nura = new Nura({ registry });
await nura.act({ type: 'open', target: 'orders' });
```

### Intent System

```ts
import { registerType, createIntent, approveIntent } from '@nura-js/intents';

// Register intent type
registerType({
  type: 'orders.create',
  schema: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  mapper: (payload) => ({
    type: 'ui.open',
    payload,
    uiHint: { target: 'orderForm' },
  }),
});

// Create and approve intent
const { id } = await createIntent({
  type: 'orders.create',
  payload: { id: 'o-100' },
});

await approveIntent(id);
```

### React Integration

```tsx
import { NuraProvider, useNuraAction } from '@nura-js/react';
import { createRegistry } from '@nura-js/core';

const registry = createRegistry({ /* ... */ });

function App() {
  return (
    <NuraProvider registry={registry}>
      <OrdersButton />
    </NuraProvider>
  );
}

function OrdersButton() {
  const { execute } = useNuraAction({
    verb: 'open',
    scope: 'orders',
    handler: () => console.log('Opening orders'),
  });

  return <button onClick={() => execute()}>Open Orders</button>;
}
```

## Module Reference

### @nura-js/core
Core runtime and linguistic utilities:
- `Nura` - Main runtime class for action execution
- `createRegistry` - Registry factory with full configuration
- `ContextManager` - Context persistence and confirmation
- `stripWake` - Wake word removal
- `parseNumeral` - Written number parsing
- `normalizeSynonyms` - Synonym harmonization
- `detectLocale` - Locale detection
- `createI18n` - Internationalization system
- `createLexicon` - Terminology management
- `createTelemetry` - Event emission system

### @nura-js/intents
Intent definition and execution:
- `registerType` - Register intent specifications
- `createIntent` - Create new intents
- `approveIntent` - Approve pending intents
- `executeIntent` - Execute intents directly
- `getIntent` - Retrieve intent status
- `getIntentResult` - Get execution results
- `IntentService` - Service class for custom implementations
- `SimplePolicyEngine` - Default policy engine
- `AjvSchemaValidator` - JSON Schema validator

### @nura-js/client
Client SDK for intent interactions:
- `AiClient` - HTTP client for intent API
- `UiDispatcher` - UI event dispatcher

### @nura-js/react
React adapter:
- `NuraProvider` - Context provider
- `useNura` - Access registry and indexer
- `useNuraAction` - Register and execute actions
- `useNuraPermission` - Permission checking
- `NuraElement` - Declarative action component
- `NuraButton` - Action button component

### @nura-js/transport-http
HTTP transport layer:
- `createIntentRouter` - Express/Fastify router factory
- `buildRouter` - Custom router builder

## Documentation

- **Full Documentation**: [docs/index.md](./docs/index.md)
- **API Reference**: [docs/api/](./docs/api/)
- **Guides**: [docs/guide/](./docs/guide/)
- **Architecture**: [docs/internals/architecture.md](./docs/internals/architecture.md)

## Community & Support

- **GitHub**: [https://github.com/nura-ia/nurajs](https://github.com/nura-ia/nurajs)
- **Issues**: [https://github.com/nura-ia/nurajs/issues](https://github.com/nura-ia/nurajs/issues)
- **Website**: [https://nura.dev](https://nura.dev)

## Security

- **Vulnerability Reports**: [security@nura.dev](mailto:security@nura.dev)
- **Security Policy**: [SECURITY.md](./SECURITY.md)

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**"Create a world where apps feel profoundly human—so present and gentle you could swear they almost breathe."**
