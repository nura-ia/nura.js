# Recipes

Practical examples for agent-aware interfaces built with Nura.js.

- Explore the [AI intents recipe](../recipes/ai-intents.md) for bridging AI-driven UI flows.

## Register an Action with Slots

```ts
import { createRegistry, defineActionSpec } from '@nura/core';

export const registry = createRegistry({
  actions: [
    defineActionSpec({
      name: 'checkout',
      type: 'intent',
      target: 'cart',
      slots: {
        paymentMethod: {
          kind: 'enum',
          values: ['card', 'wallet', 'cash'],
        },
        shippingSpeed: {
          kind: 'enum',
          values: ['standard', 'express'],
          optional: true,
        },
      },
      run: async ({ slots, context }) => {
        await context.api.checkout({
          paymentMethod: slots.paymentMethod,
          shippingSpeed: slots.shippingSpeed ?? 'standard',
        });
        return { ok: true };
      },
    }),
  ],
});
```

## Normalize Synonyms by Locale

```ts
import { normalizeSynonyms } from '@nura/core/synonyms';

const normalized = normalizeSynonyms('abre el menú de pedidos', 'es');
// → "abre el menú de órdenes"
```

## Parse Numerals inside Commands

```ts
import { parseNumeral } from '@nura/core/numerals';

const quantity = parseNumeral('quince', 'es');
// quantity === 15
```

## Rank Intents with Fuzzy Helpers

```ts
import { rankCandidates } from '@nura/plugin-fuzzy';

const intents = [
  { id: 'open.orders', phrase: 'abre el menú de órdenes' },
  { id: 'delete.order', phrase: 'borra la orden {id}' },
];

const { best } = rankCandidates('abre el menú de pedidos', intents, {
  threshold: 0.8,
  strategy: 'hybrid',
});

if (best?.score && best.score >= 0.8) {
  console.log('Matched intent:', best.id);
}
```

## Wire the Voice Agent

```ts
import { createRegistry, defineActionSpec } from '@nura/core';
import { voiceAgent } from '@nura/plugin-voice';

const registry = createRegistry({
  actions: [
    defineActionSpec({
      name: 'open_orders',
      type: 'open',
      target: 'orders',
      phrases: {
        'es-CR': { canonical: ['abre órdenes'], wake: ['hey nura'] },
      },
    }),
  ],
  agents: [voiceAgent({ wakeWords: ['hey nura'] })],
});

registry.agents.start('voice', {
  locale: 'es-CR',
  intents: registry.actions.intents(),
});
```

## Highlight Annotated Elements

```ts
import { DOMIndexer } from '@nura/dom';

const indexer = new DOMIndexer({ autoScan: true });
console.log(indexer.getAll().map(el => el.dataset.nuAct));
```

Pair these snippets with the adapters in `@nura/react`, `@nura/vue`, and `@nura/svelte` to connect DOM metadata with agent
handlers.
