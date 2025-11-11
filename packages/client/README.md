# @nura-js/client

Interact with the Nura AI intent surface from any UI or automation client. This package provides an HTTP client for intent operations and a UI dispatcher for handling intent results.

## Installation

```bash
pnpm add @nura-js/client
```

## Overview

`@nura-js/client` provides two main components:

1. **AiClient** - HTTP client for communicating with intent API endpoints
2. **UiDispatcher** - Event dispatcher for handling intent results in the UI

## AiClient

HTTP client for intent operations with automatic JSON handling and error management.

### Constructor

```ts
import { AiClient } from '@nura-js/client';

const client = new AiClient(
  'https://api.example.com/ai',
  fetch, // optional: custom fetch implementation
);
```

**Parameters:**
- `baseUrl: string` - Base URL for intent API (trailing slash optional)
- `fetchImpl?: typeof fetch` - Custom fetch implementation (default: `globalThis.fetch`)

### Methods

#### createIntent

Creates a new intent via HTTP POST.

```ts
const response = await client.createIntent({
  type: 'orders.create',
  payload: { id: 'o-88', customerId: 'c-123' },
  uiHint: {
    target: 'orderForm',
    open: true,
  },
  context: {
    locale: 'en-US',
    tenant: 'tenant-1',
    user: 'user-123',
    roles: ['admin'],
  },
});
// → { intentId: 'abc123', id: 'abc123', status: 'done' | 'requires_approval', result?: {...} }
```

**Endpoint:** `POST /ai/intents`

**Request Body:** `NIntent`

**Response:** `NIntentResponse`

#### approveIntent

Approves a pending intent via HTTP POST.

```ts
const response = await client.approveIntent('intent-id-123');
// → { intentId: 'intent-id-123', status: 'done', result: {...} }
```

**Endpoint:** `POST /ai/intents/:intentId/approve`

**Response:** `NIntentResponse`

#### getIntent

Retrieves intent status and result via HTTP GET.

```ts
const response = await client.getIntent('intent-id-123');
// → { intentId: 'intent-id-123', status: 'requires_approval' | 'done', result?: {...} }
```

**Endpoint:** `GET /ai/intents/:intentId`

**Response:** `NIntentResponse`

#### getIntentResult

Retrieves intent result, throwing if intent is not complete.

```ts
try {
  const result = await client.getIntentResult('intent-id-123');
  // → { type: 'ui.open', payload: {...}, uiHint: {...} }
} catch (error) {
  // Intent is not complete yet
  console.error('Intent not complete:', error.message);
}
```

**Implementation:** Calls `getIntent()` and throws if `result` is missing.

### Error Handling

The client automatically handles HTTP errors and JSON parsing:

```ts
try {
  await client.createIntent({ type: 'invalid.type', payload: {} });
} catch (error) {
  if (error instanceof Error) {
    console.error('Request failed:', error.message);
    // Error messages come from server response or network errors
  }
}
```

**Error Cases:**
- Network errors (connection failed, timeout)
- HTTP errors (4xx, 5xx status codes)
- Invalid JSON responses
- Missing `intentId` in response

## UiDispatcher

Event dispatcher for handling intent results in the UI. Registers handlers for specific intent result types and dispatches results to appropriate handlers.

### Constructor

```ts
import { UiDispatcher } from '@nura-js/client';

const dispatcher = new UiDispatcher();
```

### Methods

#### register

Registers a handler for a specific intent result type.

```ts
dispatcher.register('ui.open', (payload, uiHint) => {
  if (uiHint?.target) {
    openModal(uiHint.target);
  }
  console.log('Opening:', payload);
});

dispatcher.register('ui.close', (payload) => {
  closeModal();
});

dispatcher.register('ui.navigate', (payload, uiHint) => {
  router.push(uiHint?.target || '/');
});
```

**Parameters:**
- `type: string` - Intent result type to handle
- `fn: UiHandler` - Handler function `(payload, uiHint?) => void`

**Handler Signature:**
```ts
type UiHandler = (
  payload: unknown,
  uiHint?: {
    open?: boolean;
    target?: string;
    focus?: string;
  }
) => void;
```

#### dispatch

Dispatches an intent result to the registered handler.

```ts
const result = await client.getIntentResult('intent-id-123');
dispatcher.dispatch(result);
// → Calls registered handler for result.type
```

**Parameters:**
- `result: NIntentResult` - Intent result to dispatch

**Behavior:**
- Looks up handler by `result.type`
- Calls handler with `result.payload` and `result.uiHint`
- Silently ignores if no handler is registered

## Complete Example

```ts
import { AiClient, UiDispatcher } from '@nura-js/client';

// Initialize client and dispatcher
const client = new AiClient('https://api.example.com/ai');
const dispatcher = new UiDispatcher();

// Register UI handlers
dispatcher.register('ui.open', (payload, hint) => {
  if (hint?.target) {
    openModal(hint.target);
  }
});

dispatcher.register('ui.close', () => {
  closeModal();
});

dispatcher.register('ui.navigate', (payload, hint) => {
  router.push(hint?.target || '/');
});

// Create and handle intent
async function handleUserCommand(command: string) {
  try {
    // Create intent from user command
    const { id, status } = await client.createIntent({
      type: 'orders.create',
      payload: { command },
      context: {
        user: currentUser.id,
        roles: currentUser.roles,
      },
    });

    // If requires approval, show approval UI
    if (status === 'requires_approval') {
      const approved = await showApprovalDialog(id);
      if (approved) {
        await client.approveIntent(id);
      }
    }

    // Get result and dispatch to UI
    const result = await client.getIntentResult(id);
    dispatcher.dispatch(result);
  } catch (error) {
    console.error('Intent handling failed:', error);
    showError(error.message);
  }
}
```

## Integration with React

```tsx
import { useEffect } from 'react';
import { AiClient, UiDispatcher } from '@nura-js/client';

function useIntentClient(baseUrl: string) {
  const client = new AiClient(baseUrl);
  const dispatcher = new UiDispatcher();

  useEffect(() => {
    // Register handlers
    dispatcher.register('ui.open', (payload, hint) => {
      // Handle UI open
    });

    dispatcher.register('ui.close', () => {
      // Handle UI close
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  return { client, dispatcher };
}

function MyComponent() {
  const { client, dispatcher } = useIntentClient('https://api.example.com/ai');

  const handleCommand = async (command: string) => {
    const { id } = await client.createIntent({
      type: 'command.execute',
      payload: { command },
    });

    const result = await client.getIntentResult(id);
    dispatcher.dispatch(result);
  };

  return <button onClick={() => handleCommand('open orders')}>Open Orders</button>;
}
```

## Type Reference

### Core Types

- `UiHandler` - Handler function type `(payload, uiHint?) => void`
- `NIntent` - Intent definition (from `@nura-js/intents`)
- `NIntentResponse` - Intent response (from `@nura-js/intents`)
- `NIntentResult` - Intent result (from `@nura-js/intents`)

## Additional Resources

- **Repository**: <https://github.com/nura-ia/nurajs>
- **Issues**: <https://github.com/nura-ia/nurajs/issues>
- **Intent Module**: [docs/modules/intents.md](../../docs/modules/intents.md)
- **Transport HTTP**: [docs/modules/transport-http.md](../../docs/modules/transport-http.md)
