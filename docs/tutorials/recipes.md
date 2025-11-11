# Recipes

Practical examples for agent-aware interfaces built with Nura.js.

- Explore the [AI intents recipe](../recipes/ai-intents.md) for bridging AI-driven UI flows.

## Register an Action with Slots

```ts
import { createRegistry, defineActionSpec } from '@nura-js/core';

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
import { normalizeSynonyms } from '@nura-js/core/synonyms';

const normalized = normalizeSynonyms('open the orders menu', 'en');
// → "open the orders menu"
```

## Parse Numerals inside Commands

```ts
import { parseNumeral } from '@nura-js/core/numerals';

const quantity = parseNumeral('fifteen', 'en');
// quantity === 15
```

## Rank Intents with Fuzzy Helpers

```ts
import { rankCandidates } from '@nura-js/plugin-fuzzy';

const intents = [
  { id: 'open.orders', phrase: 'open the orders menu' },
  { id: 'delete.order', phrase: 'delete order {id}' },
];

const { best } = rankCandidates('open the orders menu', intents, {
  threshold: 0.8,
  strategy: 'hybrid',
});

if (best?.score && best.score >= 0.8) {
  console.log('Matched intent:', best.id);
}
```

## Wire the Voice Agent

```ts
import { createRegistry, defineActionSpec } from '@nura-js/core';
import { voiceAgent } from '@nura-js/plugin-voice';

const registry = createRegistry({
  actions: [
    defineActionSpec({
      name: 'open_orders',
      type: 'open',
      target: 'orders',
      phrases: {
        'en-US': { canonical: ['open orders'], wake: ['hey nura'] },
      },
    }),
  ],
  agents: [voiceAgent({ wakeWords: ['hey nura'] })],
});

registry.agents.start('voice', {
  locale: 'en-US',
  intents: registry.actions.intents(),
});
```

## Highlight Annotated Elements

```ts
import { DOMIndexer } from '@nura-js/dom';

const indexer = new DOMIndexer({ autoScan: true });
console.log(indexer.getAll().map(el => el.dataset.nuAct));
```

Pair these snippets with the adapters in `@nura-js/react`, `@nura-js/vue`, and `@nura-js/svelte` to connect DOM metadata with agent
handlers.
