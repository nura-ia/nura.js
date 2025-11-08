# @nura/react

Official React adapter for consuming the Nura.js runtime with declarative components and hooks.

## Installation

```bash
pnpm add @nura/react
```

## Usage Example

```tsx
import { createRegistry } from '@nura/core';
import { NuraProvider, useNuraAction } from '@nura/react';

const registry = createRegistry({
  // define actions and agents
});

export function App() {
  return (
    <NuraProvider registry={registry}>
      <OrdersButton />
    </NuraProvider>
  );
}

function OrdersButton() {
  const action = useNuraAction('open_orders');
  return (
    <button onClick={() => action?.run?.()} data-nu-act={JSON.stringify(action?.spec)}>
      Open orders
    </button>
  );
}
```

## Key APIs

- `NuraProvider` injects the registry into the React tree.
- `useNura` returns the `Nura` runtime and helpers.
- `useNuraAction` resolves actions by name and exposes execution helpers.
- `useNuraPermission` evaluates declarative permissions inside components.
- `NuraElement` renders helpers that sync `data-nu-*` attributes.

## Type References

- `NuraProviderProps` — provider configuration for registry and context.
- `UseNuraReturn` — runtime and registry values from `useNura`.
- `UseNuraActionOptions` — options for `useNuraAction` such as scope and arguments.
- `NuraElementProps` — props for the helper component exposing accessible attributes.

## Additional Resources

- Repository: <https://github.com/nura-ia/nurajs>
- Issues: <https://github.com/nura-ia/nurajs/issues>
