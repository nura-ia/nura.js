# @nura-js/core

Core runtime and linguistic utilities for Nura.js agent ↔ UI integrations. This package provides the foundation for action execution, natural language processing, internationalization, and context management.

## Installation

```bash
pnpm add @nura-js/core
```

## Overview

`@nura-js/core` is the foundational package that provides:

- **Action System** - Registry, execution, and permission management
- **Wake Word Processing** - Advanced wake word detection and removal
- **Natural Language Processing** - Numeral parsing, synonym normalization, locale detection
- **Context Management** - Lightweight context persistence for conversational flows
- **Internationalization** - Full i18n support with namespaces and fallbacks
- **Lexicon System** - Terminology management with phonetic matching
- **Telemetry** - Event emission system for monitoring
- **Entity Parsing** - Type-safe entity extraction (boolean, enum, date, number, range)

## Core Classes and Functions

### Nura Class

The main runtime class that orchestrates action execution with permission checks and confirmation hooks.

```ts
import { Nura, createRegistry } from '@nura-js/core';

const registry = createRegistry({ /* ... */ });
const nura = new Nura({ registry });

// Initialize runtime (emits 'nura:started' event)
nura.start();

// Execute an action
const result = await nura.act({
  type: 'open',
  target: 'orders',
  payload: { id: 123 },
});
```

**Methods:**
- `start()` - Initializes the runtime and emits global `nura:started` event
- `act(action: NAction): Promise<NResult>` - Executes an action through the registry with permission checks

**Permission Flow:**
1. Resolves actor and scope from action
2. Checks role-based permissions
3. Evaluates policy (allow/deny/confirm)
4. Prompts for confirmation if required
5. Dispatches action to handler
6. Logs audit entry

### createRegistry

Factory function that creates a complete registry with actions, permissions, i18n, lexicon, and telemetry.

```ts
import { createRegistry, defineActionSpec } from '@nura-js/core';

const registry = createRegistry({
  config: {
    app: { id: 'my-app', locale: 'en-US' },
    capabilities: { voice: true, analytics: true },
    resolveScope: (action) => action.target,
    confirm: async ({ action }) => {
      return window.confirm(`Execute ${action.type}?`);
    },
    actor: () => ({ id: 'user-1', roles: ['admin'] }),
  },
  permissions: {
    scopes: {
      orders: {
        delete: { roles: ['admin'], policy: 'confirm' },
        open: { policy: 'allow' },
      },
    },
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
  routes: {
    'open::orders': async (payload) => {
      console.log('Opening orders', payload);
      return { ok: true };
    },
  },
  i18n: {
    defaultLocale: 'en-US',
    fallbackLocales: ['en', 'es'],
    bundles: {
      'en-US': {
        common: { welcome: 'Welcome' },
        actions: { open: 'Open' },
      },
    },
  },
  seedLexicon: [
    { locale: 'en-US', terms: { 'orders': 'orders', 'pedidos': 'orders' } },
  ],
});
```

**Registry Methods:**
- `actions.dispatch(action)` - Dispatch an action
- `actions.listSpecs()` - List all action specifications
- `actions.register(spec)` - Register a new action spec
- `registerAction(action)` - Register legacy action
- `unregisterAction(verb, scope)` - Unregister action
- `executeAction(verb, scope, params)` - Execute registered action
- `on(type, listener)` - Subscribe to registry events
- `addPermission(permission)` - Add permission rule
- `removePermission(scope)` - Remove permission
- `hasPermission(verb, scope)` - Check permission
- `i18n.t(namespace, key, vars)` - Translate message
- `lexicon.normalize(locale, term)` - Normalize term
- `telemetry.emit(event, payload)` - Emit telemetry event

### ContextManager

Lightweight context manager for conversational flows with confirmation detection.

```ts
import { ContextManager } from '@nura-js/core/context';

const ctx = new ContextManager();

// Save an action for later confirmation
ctx.save({
  type: 'delete',
  target: 'order',
  payload: { id: 15 },
});

// Check if user confirms the saved action
const confirmed = ctx.maybeConfirm('yes, delete it');
// Returns: { type: 'delete', target: 'order', payload: { id: 15 } }
// or null if not confirmed

// Get last saved action
const last = ctx.getLast();
```

**Supported Confirmation Phrases:**
- English: "yes", "ok", "okay", "yeah", "please", "do it", "delete it", "remove it"
- Spanish: "si", "ok", "okay", "dale", "confirma", "confirmo", "eliminala", "eliminarla"

**Methods:**
- `save(action: ContextAction)` - Save action for confirmation
- `getLast(): ContextAction | null` - Get last saved action
- `maybeConfirm(utterance: string): ContextAction | null` - Check if utterance confirms saved action

### Wake Word Processing

#### stripWake

Removes wake words from input text using fuzzy matching algorithms.

```ts
import { stripWake } from '@nura-js/core/wake';

const result = stripWake('ok nora open orders menu', {
  aliases: ['nora', 'lura', 'nula'],
  minConfidence: 0.7,
  compareWakeWord: customComparator, // optional
  compare: customStringCompare, // optional
});
// → "open orders menu"
```

**Algorithm:**
1. Tokenizes input text
2. Looks for wake prefixes ("ok", "okay", "okey")
3. Matches aliases using fuzzy comparison (Damerau-Levenshtein + Soundex)
4. Removes best match if confidence ≥ minConfidence
5. Returns cleaned text

**Options:**
- `aliases?: string[]` - Wake word aliases (default: includes "nura")
- `minConfidence?: number` - Minimum similarity score (default: 0.7)
- `compareWakeWord?: CompareWakeWord` - Custom wake word comparator
- `compare?: (a: string, b: string) => number` - Custom string comparator

#### compareWakeWord

Default wake word comparison function using fuzzy matching.

```ts
import { compareWakeWord } from '@nura-js/core/wake';

const result = compareWakeWord('nora', {
  canonical: 'nura',
  aliases: ['lura', 'nula'],
}, { minConfidence: 0.7 });
// → { score: 0.85, value: 'nura', strategy: 'fuzzy' }
```

### Natural Language Processing

#### parseNumeral

Converts written numbers to numeric values with locale support.

```ts
import { parseNumeral } from '@nura-js/core/numerals';

parseNumeral('fifteen', 'en'); // → 15
parseNumeral('quince', 'es'); // → 15
parseNumeral('123', 'en'); // → 123 (direct numeric)
```

**Supported Locales:**
- English: "fifteen" → 15
- Spanish: "quince" → 15

#### normalizeSynonyms

Harmonizes synonyms to canonical forms per locale.

```ts
import { normalizeSynonyms } from '@nura-js/core/synonyms';

normalizeSynonyms('pedidos', 'es'); // → "ordenes"
normalizeSynonyms('orders', 'en'); // → "orders" (no change)
```

**Current Mappings:**
- Spanish: "pedidos" → "ordenes"

#### detectLocale

Detects locale from content using token heuristics.

```ts
import { detectLocale } from '@nura-js/core/locale';

detectLocale('open orders menu', ['en-US', 'es-CR']); // → "en"
detectLocale('abre el menú de órdenes', ['en-US', 'es-CR']); // → "es"
```

**Detection Patterns:**
- English: "open", "delete", "order", "menu", "please", "remove"
- Spanish: "abr(e|ir)", "elimina(r)", "borra(r)?", "orden(es)?", "pedido(s)?", "menú", "menu"

### Internationalization

#### createI18n

Creates an i18n system with namespace support and fallback chains.

```ts
import { createI18n } from '@nura-js/core';

const i18n = createI18n({
  defaultLocale: 'en-US',
  fallbackLocales: ['en', 'es'],
  bundles: {
    'en-US': {
      common: { welcome: 'Welcome {{name}}' },
      actions: { open: 'Open' },
    },
    'es-CR': {
      common: { welcome: 'Bienvenido {{name}}' },
    },
  },
  detect: () => navigator.language,
  telemetry: myTelemetry,
});

i18n.t('common', 'welcome', { name: 'John' }); // → "Welcome John"
i18n.setLocale('es-CR');
i18n.t('common', 'welcome', { name: 'John' }); // → "Bienvenido John"
i18n.register('en-US', 'common', { goodbye: 'Goodbye' });
```

**Methods:**
- `getLocale(): NLocale` - Get current locale
- `setLocale(locale: NLocale)` - Set locale
- `t(namespace, key, vars?)` - Translate with variable interpolation
- `has(namespace, key, locale?)` - Check if key exists
- `register(locale, namespace, entries)` - Register messages
- `resolveKey(locale, namespace, key)` - Resolve key without interpolation

### Lexicon System

#### createLexicon

Creates a lexicon for terminology management with phonetic matching.

```ts
import { createLexicon } from '@nura-js/core';

const lexicon = createLexicon(telemetry);

// Register single term
lexicon.register('en-US', 'orders', { canonical: 'orders', weight: 1 });

// Bulk registration
lexicon.bulk('en-US', {
  'pedidos': 'orders',
  'ordenes': 'orders',
  'comandas': 'orders',
});

// Phonetic registration (for voice recognition)
lexicon.registerPhonetic('en', 'nora', 'nura');
lexicon.registerPhonetic('es', 'nula', 'nura');

// Normalize term
lexicon.normalize('en-US', 'pedidos'); // → "orders"
lexicon.lookupPhonetic('en', 'nora'); // → "nura"
```

**Methods:**
- `register(locale, term, sense)` - Register term with canonical form
- `bulk(locale, batch)` - Bulk register terms
- `normalize(locale, term)` - Get canonical form for term
- `registerPhonetic(locale, term, canonical)` - Register phonetic mapping
- `lookupPhonetic(locale, term)` - Lookup phonetic match

### Telemetry

#### createTelemetry

Creates an event emission system for monitoring and debugging.

```ts
import { createTelemetry } from '@nura-js/core';

const telemetry = createTelemetry();

// Subscribe to specific event
telemetry.on('action.executed', (payload) => {
  console.log('Action executed:', payload);
});

// Subscribe to all events
telemetry.on('*', ({ event, ...payload }) => {
  console.log(`Event ${event}:`, payload);
});

// Emit event
telemetry.emit('action.executed', { type: 'open', target: 'orders' });

// Unsubscribe
telemetry.off('action.executed', handler);
```

**Methods:**
- `on(event, handler)` - Subscribe to event
- `off(event, handler)` - Unsubscribe from event
- `emit(event, payload?)` - Emit event

### Entity Parsing

Type-safe entity extraction from strings.

```ts
import { parseBoolean, parseEnum, parseDate, parseRangeNumber, parseNumber } from '@nura-js/core/entities';

// Boolean parsing
parseBoolean('yes', { locale: 'en' }); // → true
parseBoolean('no', { locale: 'en' }); // → false

// Enum parsing
parseEnum('red', { locale: 'en', options: ['red', 'green', 'blue'] }); // → "red"

// Date parsing
parseDate('2024-01-15', { locale: 'en' }); // → Date object

// Range number parsing
parseRangeNumber('10-20', { locale: 'en' }); // → { min: 10, max: 20 }

// Number parsing
parseNumber('123.45'); // → 123.45
parseNumber('1,234.56'); // → 1234.56
```

### Action Specifications

#### defineActionSpec

Defines an action specification with phrases, entities, and validation.

```ts
import { defineActionSpec } from '@nura-js/core';

const spec = defineActionSpec({
  name: 'open_orders',
  type: 'open',
  target: 'orders',
  scope: 'orders',
  locale: 'en-US',
  phrases: {
    'en-US': {
      canonical: ['open orders', 'show orders'],
      synonyms: ['display orders', 'view orders'],
      labels: ['Orders', 'Order List'],
    },
    'es-CR': {
      canonical: ['abrir órdenes', 'mostrar órdenes'],
    },
  },
  entities: [
    {
      name: 'orderId',
      type: 'number',
      parse: (raw, ctx) => parseNumber(raw),
    },
  ],
  validate: (payload) => {
    return payload && typeof payload.orderId === 'number';
  },
  aliases: {
    wake: ['nora', 'lura'],
    commands: [
      { locale: 'en', variants: ['open', 'show', 'display'] },
      { locale: 'es', variants: ['abrir', 'mostrar'] },
    ],
    entities: {
      orderId: ['order', 'orden'],
    },
  },
  meta: {
    description: 'Opens the orders view',
    icon: 'orders',
    category: 'navigation',
  },
});
```

## Type Reference

### Core Types

- `NAction` - Executable action (modern: `{ type, target, payload }` or legacy: `{ verb, scope, handler }`)
- `NResult` - Action result `{ ok: boolean, message?: string }`
- `NRegistry` - Complete registry with actions, permissions, i18n, lexicon, telemetry
- `NActionSpec` - Action specification with phrases and entities
- `NActionCatalog` - Action dispatcher interface
- `NLocale` - BCP 47 locale identifier (`'en-US'`, `'es-CR'`)
- `NAgent` - Plugin extension for runtime
- `NActor` - User/agent context `{ id?, roles?, via? }`
- `NPermissionRule` - Permission rule `{ roles?, confirm?, policy? }`
- `NPolicy` - Policy type: `'allow' | 'deny' | 'confirm'`

### Action Types

- `NActionType` - Predefined action types: `'open' | 'close' | 'toggle' | 'create' | 'update' | 'delete' | 'filter' | 'set' | 'navigate' | 'focus' | 'view' | 'hover' | 'speak' | 'custom' | 'click' | 'reset' | 'increment'`

### Entity Types

- `NEntityType` - Entity type: `'string' | 'number' | 'enum' | 'boolean' | 'date' | 'range_number'`
- `NEntityDef` - Entity definition with parse/format functions

## Additional Resources

- **Repository**: <https://github.com/nura-ia/nurajs>
- **Issues**: <https://github.com/nura-ia/nurajs/issues>
- **API Documentation**: [docs/api/packages/core.md](../../docs/api/packages/core.md)
