# @nura/vue

Official Vue 3 adapter that exposes directives and provide/inject helpers for the Nura.js runtime.

## Installation

```bash
pnpm add @nura/vue
```

## Usage Example

```ts
import { createApp } from 'vue';
import { Nura, createRegistry, defineActionSpec } from '@nura/core';
import { withVue } from '@nura/vue';
import App from './App.vue';

const registry = createRegistry({
  actions: [defineActionSpec({ name: 'open_orders', type: 'open', target: 'orders' })],
});

const nura = new Nura({ registry });

createApp(App)
  .use(withVue(nura))
  .mount('#app');
```

```vue
<template>
  <button v-nu-act="action" v-nu-listen="'open'" data-nu-scope="orders">
    Open orders
  </button>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { NURA_KEY } from '@nura/vue';

const nura = inject(NURA_KEY);
const action = nura?.registry.actions.find('open_orders');
</script>
```

## Key APIs

- `withVue` registers `v-nu-*` directives and exposes the runtime via provide/inject.
- `NURA_KEY` is the injection key for retrieving the `Nura` instance.
- `nu-act` serializes actions into `data-nu-act` attributes and handles click events.
- `nu-listen` marks scopes and listening priorities in the DOM.

## Type References

- `GuardBinding` — configuration for the permission guard directive.
- `InjectionKey<Nura>` — type of the `NURA_KEY` injection token.
- `NuActElement` — extended element that manages action metadata.

## Additional Resources

- Repository: <https://github.com/nura-ia/nurajs>
- Issues: <https://github.com/nura-ia/nurajs/issues>
