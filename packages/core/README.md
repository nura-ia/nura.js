# @nura/core

Core runtime and linguistic utilities for Nura.js agent ↔ UI integrations.

## Installation

```bash
pnpm add @nura/core
```

## Usage Example

```ts
import {
  Nura,
  ContextManager,
  createRegistry,
  defineActionSpec,
  stripWake,
  detectLocale,
  parseNumeral,
  normalizeSynonyms,
} from '@nura/core';

const registry = createRegistry({
  actions: [
    defineActionSpec({
      name: 'open_orders',
      type: 'open',
      target: 'orders',
      phrases: {
        'es-CR': { canonical: ['abre órdenes'] },
      },
    }),
  ],
});

const nura = new Nura({ registry });
const context = new ContextManager({ locale: 'es-CR' });
context.set('customerId', 42);

const input = 'hey nura abre órdenes';
const withoutWake = stripWake(input, { wakeWords: ['hey nura'] });
const locale = detectLocale(withoutWake, ['es-CR', 'en-US']);
const amount = parseNumeral('quince', locale);
const normalized = normalizeSynonyms('árbol', locale);

await nura.act({
  type: 'open',
  target: 'orders',
  meta: { desc: `Abrir ${normalized} (${amount})` },
});
```

## Key APIs

- `Nura` orchestrates registered actions with permission hooks.
- `createRegistry` builds the registry of actions, entities, and connected agents.
- `ContextManager` keeps follow-up context and confirmation helpers.
- `stripWake` normalizes wake phrases.
- `detectLocale` identifies a locale using token heuristics.
- `parseNumeral` converts localized numerals to numbers.
- `normalizeSynonyms` harmonizes synonyms per locale dictionary.

## Type References

- `NAction` — executable action shape.
- `NRegistry` — registry definition including actions and agents.
- `NLocale` — BCP 47 locale identifier (`'es-CR'`, `'en-US'`).
- `NAgent` — plugin extension for the runtime.

## Additional Resources

- Repository: <https://github.com/nura-ia/nurajs>
- Issues: <https://github.com/nura-ia/nurajs/issues>
