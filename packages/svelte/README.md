# @nura/svelte

Official Svelte adapter that initializes Nura.js with stores, actions, and DOM-aware components.

## Installation

```bash
pnpm add @nura/svelte
```

## Usage Example

```svelte
<script lang="ts">
  import { initNura, NuraProvider, nuraAction } from '@nura/svelte';
  import { defineActionSpec } from '@nura/core';

  const { registry } = initNura({
    actions: [
      defineActionSpec({ name: 'open_orders', type: 'open', target: 'orders' }),
    ],
  });
</script>

<NuraProvider {registry}>
  <button use:nuraAction={{ name: 'open_orders' }} data-nu-scope="orders">
    Open orders
  </button>
</NuraProvider>
```

## Key APIs

- `initNura` creates the registry and shares context across the Svelte tree.
- `NuraProvider` exposes context and `data-nu-*` helpers.
- `nura` syncs interaction telemetry via a generic action.
- `nuraAction` registers intents and executes actions from elements.
- `createNuraStore` builds derived stores for runtime helpers and permissions.

## Type References

- `NuraContext` — shared context with registry and DOM indexer.
- `NuraActionParams` — parameters for the `nura` action (scope, metadata, etc.).
- `UseNuraReturn` — helper result for accessing the runtime in scripts.
- `UseNuraActionOptions` — configuration for retrieving reactive actions.

## Additional Resources

- Repository: <https://github.com/nura-ia/nurajs>
- Issues: <https://github.com/nura-ia/nurajs/issues>
