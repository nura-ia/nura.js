# @nura-js/react

Official React adapter for consuming the Nura.js runtime with declarative components and hooks. This package provides React-specific integrations for the Nura.js action system, permissions, and DOM indexing.

## Installation

```bash
pnpm add @nura-js/react @nura-js/core @nura-js/dom
```

## Overview

`@nura-js/react` provides:

- **Context Provider** - Injects registry and indexer into React tree
- **Custom Hooks** - Access registry, actions, permissions, and events
- **Components** - Declarative components for actions and permissions
- **Type Safety** - Full TypeScript support with proper types

## Quick Start

```tsx
import { createRegistry } from '@nura-js/core';
import { NuraProvider, useNuraAction } from '@nura-js/react';

const registry = createRegistry({
  config: { app: { id: 'my-app' } },
});

export function App() {
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

## API Reference

### NuraProvider

Context provider that injects the registry and DOM indexer into the React tree.

```tsx
import { NuraProvider } from '@nura-js/react';
import { createRegistry } from '@nura-js/core';
import { createIndexer } from '@nura-js/dom';

const registry = createRegistry({ /* ... */ });
const indexer = createIndexer();

function App() {
  return (
    <NuraProvider registry={registry} indexer={indexer}>
      <YourApp />
    </NuraProvider>
  );
}
```

**Props:**
- `registry: NuraRegistry` - Registry instance (required)
- `indexer?: DOMIndexer` - DOM indexer instance (optional)

**Usage:**
- Must wrap your app or component tree
- Provides registry and indexer to all child components via context
- Only one provider should exist per app

### useNura

Hook to access the registry and DOM indexer from context.

```tsx
import { useNura } from '@nura-js/react';

function MyComponent() {
  const { registry, indexer } = useNura();

  const handleAction = async () => {
    await registry.act({
      type: 'open',
      target: 'orders',
    });
  };

  return <button onClick={handleAction}>Open</button>;
}
```

**Returns:**
```ts
{
  registry: NuraRegistry;
  indexer: DOMIndexer;
}
```

**Throws:** Error if used outside `NuraProvider`

### useNuraAction

Hook to register and execute actions in components.

```tsx
import { useNuraAction } from '@nura-js/react';

function OrdersButton() {
  const { execute } = useNuraAction({
    verb: 'open',
    scope: 'orders',
    handler: async (params) => {
      console.log('Opening orders', params);
      await openOrdersView();
    },
    description: 'Opens the orders view',
    metadata: { category: 'navigation' },
    enabled: true, // optional, default: true
  });

  return <button onClick={() => execute()}>Open Orders</button>;
}
```

**Options:**
- `verb: NuraVerb` - Action verb (e.g., 'open', 'delete', 'create')
- `scope: NuraScope` - Action scope (e.g., 'orders', 'customers')
- `handler: (params?) => void | Promise<void>` - Action handler function
- `description?: string` - Action description
- `metadata?: Record<string, any>` - Additional metadata
- `enabled?: boolean` - Whether action is enabled (default: true)

**Returns:**
```ts
{
  execute: (params?: Record<string, any>) => Promise<NResult>;
}
```

**Behavior:**
- Registers action on mount
- Unregisters action on unmount
- Re-registers if dependencies change
- Handler receives optional params object

### useNuraPermission

Hook to check permissions declaratively.

```tsx
import { useNuraPermission } from '@nura-js/react';

function DeleteButton() {
  const hasPermission = useNuraPermission({
    verb: 'delete',
    scope: 'orders',
  });

  if (!hasPermission) {
    return null;
  }

  return <button onClick={handleDelete}>Delete</button>;
}
```

**Options:**
- `verb: NuraVerb` - Action verb
- `scope: NuraScope` - Action scope

**Returns:** `boolean` - Whether permission is granted

### useHasPermission

Alias for `useNuraPermission` with same API.

```tsx
import { useHasPermission } from '@nura-js/react';

const canDelete = useHasPermission('delete', 'orders');
```

### useNuraEvent

Hook to subscribe to a specific registry event.

```tsx
import { useNuraEvent } from '@nura-js/react';

function ActionLogger() {
  useNuraEvent('action:executed', (event) => {
    console.log('Action executed:', event.data);
  });

  return null;
}
```

**Parameters:**
- `type: NuraEventType` - Event type to listen to
- `listener: NuraEventListener` - Event handler function

**Event Types:**
- `'action:registered'` - Action registered
- `'action:unregistered'` - Action unregistered
- `'action:executed'` - Action executed
- `'action:error'` - Action error
- `'permission:added'` - Permission added
- `'permission:removed'` - Permission removed
- `'permission:denied'` - Permission denied
- `'element:indexed'` - Element indexed
- `'element:removed'` - Element removed

### useNuraEvents

Hook to subscribe to multiple registry events.

```tsx
import { useNuraEvents } from '@nura-js/react';

function EventLogger() {
  useNuraEvents({
    'action:executed': (event) => console.log('Executed:', event),
    'action:error': (event) => console.error('Error:', event),
  });

  return null;
}
```

**Parameters:**
- `handlers: Record<NuraEventType, NuraEventListener>` - Map of event types to handlers

### useNuraElement

Hook to create a Nura element reference with automatic indexing.

```tsx
import { useNuraElement } from '@nura-js/react';

function OrdersList() {
  const { ref, element } = useNuraElement({
    scope: 'orders',
    verbs: ['open', 'delete'],
    metadata: { category: 'list' },
  });

  return <div ref={ref}>Orders List</div>;
}
```

**Options:**
- `scope: NuraScope` - Element scope
- `verbs: NuraVerb[]` - Available action verbs
- `metadata?: Record<string, any>` - Element metadata

**Returns:**
```ts
{
  ref: RefObject<HTMLElement>;
  element: NuraElement | null;
}
```

### NuraElement

Component that automatically syncs `data-nu-*` attributes for DOM indexing.

```tsx
import { NuraElement } from '@nura-js/react';

function OrdersList() {
  return (
    <NuraElement
      scope="orders"
      verbs={['open', 'delete']}
      metadata={{ category: 'list' }}
    >
      <div>Orders List</div>
    </NuraElement>
  );
}
```

**Props:**
- `scope: NuraScope` - Element scope
- `verbs: NuraVerb[]` - Available action verbs
- `metadata?: Record<string, any>` - Element metadata
- `children: ReactNode` - Child elements

**Behavior:**
- Automatically adds `data-nu-scope` and `data-nu-verbs` attributes
- Registers element with DOM indexer
- Unregisters on unmount

### NuraButton

Button component that executes an action on click.

```tsx
import { NuraButton } from '@nura-js/react';

function OrdersButton() {
  return (
    <NuraButton
      verb="open"
      scope="orders"
      handler={() => console.log('Opening')}
    >
      Open Orders
    </NuraButton>
  );
}
```

**Props:**
- `verb: NuraVerb` - Action verb
- `scope: NuraScope` - Action scope
- `handler: (params?) => void | Promise<void>` - Action handler
- `description?: string` - Action description
- `metadata?: Record<string, any>` - Action metadata
- `enabled?: boolean` - Whether button is enabled
- `...buttonProps` - Standard button HTML attributes

**Behavior:**
- Registers action on mount
- Executes action on click
- Disables button if action is not enabled
- Unregisters action on unmount

## Complete Examples

### Basic Action Registration

```tsx
import { NuraProvider, useNuraAction } from '@nura-js/react';
import { createRegistry } from '@nura-js/core';

const registry = createRegistry({
  config: { app: { id: 'my-app' } },
});

function App() {
  return (
    <NuraProvider registry={registry}>
      <OrdersView />
    </NuraProvider>
  );
}

function OrdersView() {
  const { execute: openOrders } = useNuraAction({
    verb: 'open',
    scope: 'orders',
    handler: () => console.log('Opening orders'),
  });

  const { execute: deleteOrder } = useNuraAction({
    verb: 'delete',
    scope: 'orders',
    handler: async (params) => {
      if (params?.id) {
        await deleteOrderById(params.id);
      }
    },
  });

  return (
    <div>
      <button onClick={() => openOrders()}>Open</button>
      <button onClick={() => deleteOrder({ id: '123' })}>Delete</button>
    </div>
  );
}
```

### Permission-Based Rendering

```tsx
import { useNuraPermission } from '@nura-js/react';

function OrderActions({ orderId }: { orderId: string }) {
  const canEdit = useNuraPermission({ verb: 'update', scope: 'orders' });
  const canDelete = useNuraPermission({ verb: 'delete', scope: 'orders' });

  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### Event Handling

```tsx
import { useNuraEvent } from '@nura-js/react';

function ActionAuditLog() {
  const [logs, setLogs] = useState<string[]>([]);

  useNuraEvent('action:executed', (event) => {
    setLogs((prev) => [
      ...prev,
      `Action executed: ${JSON.stringify(event.data)}`,
    ]);
  });

  useNuraEvent('action:error', (event) => {
    setLogs((prev) => [
      ...prev,
      `Action error: ${JSON.stringify(event.data)}`,
    ]);
  });

  return (
    <div>
      <h3>Audit Log</h3>
      <ul>
        {logs.map((log, i) => (
          <li key={i}>{log}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Declarative Actions

```tsx
import { NuraButton, NuraElement } from '@nura-js/react';

function OrdersPage() {
  return (
    <div>
      <NuraButton
        verb="open"
        scope="orders"
        handler={() => openOrdersView()}
      >
        Open Orders
      </NuraButton>

      <NuraElement scope="orders" verbs={['open', 'delete']}>
        <div>Orders List</div>
      </NuraElement>
    </div>
  );
}
```

## Type Reference

### Core Types

- `NuraProviderProps` - Provider props `{ registry: NuraRegistry, indexer?: DOMIndexer }`
- `UseNuraReturn` - Return type of `useNura` hook
- `UseNuraActionOptions` - Options for `useNuraAction` hook
- `UseNuraPermissionOptions` - Options for `useNuraPermission` hook
- `UseNuraElementOptions` - Options for `useNuraElement` hook
- `NuraElementProps` - Props for `NuraElement` component
- `NuraButtonProps` - Props for `NuraButton` component

### Imported Types

All types from `@nura-js/core` and `@nura-js/dom` are re-exported:
- `NuraRegistry`, `NuraAction`, `NuraVerb`, `NuraScope`
- `NuraEvent`, `NuraEventType`, `NuraEventListener`
- `NuraPermission`, `NuraElement`
- `DOMIndexer`

## Additional Resources

- **Repository**: <https://github.com/nura-ia/nurajs>
- **Issues**: <https://github.com/nura-ia/nurajs/issues>
- **Core Package**: [packages/core/README.md](../core/README.md)
- **DOM Package**: [packages/dom/README.md](../dom/README.md)
