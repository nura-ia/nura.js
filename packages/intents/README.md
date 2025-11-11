# @nura-js/intents

Define, validate, and execute AI intents using Nura's Intent → Approval → Execute (IAE) loop. This package provides a complete intent system with JSON Schema validation, policy-based approval workflows, and execution management.

## Installation

```bash
pnpm add @nura-js/intents
```

## Overview

`@nura-js/intents` implements a structured intent system that follows the Intent → Approval → Execute (IAE) pattern:

1. **Intent Creation** - Define and register intent types with JSON Schema validation
2. **Policy Evaluation** - Automatic approval or queuing based on policies
3. **Approval** - Manual approval for sensitive operations
4. **Execution** - Execute intents with mapper or executor functions
5. **Result Retrieval** - Get execution results and status

## Core Concepts

### Intent Lifecycle

```
createIntent() → [Policy Check] → requires_approval | queued | done
                                    ↓
                              approveIntent() → execute → done
```

### Intent Status

- `queued` - Intent is queued for execution (default for auto-approved intents)
- `requires_approval` - Intent requires manual approval before execution
- `done` - Intent has been executed and has a result

## Quick Start

```ts
import { registerType, createIntent, approveIntent, getIntentResult } from '@nura-js/intents';

// Register intent type
registerType({
  type: 'orders.create',
  schema: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
    additionalProperties: false,
  },
  mapper: (payload) => ({
    type: 'ui.open',
    payload,
    uiHint: { target: 'orderForm' },
  }),
});

// Create intent
const { id } = await createIntent({
  type: 'orders.create',
  payload: { id: 'o-100' },
});

// If requires approval, approve it
if (response.status === 'requires_approval') {
  await approveIntent(id);
}

// Get result
const result = await getIntentResult(id);
```

## API Reference

### Intent Registration

#### registerType

Registers an intent type with schema, policy, and execution logic.

```ts
import { registerType } from '@nura-js/intents';

registerType({
  type: 'orders.create',
  schema: {
    type: 'object',
    required: ['id', 'customerId'],
    properties: {
      id: { type: 'string' },
      customerId: { type: 'string' },
      amount: { type: 'number', minimum: 0 },
    },
    additionalProperties: false,
  },
  policy: {
    requiresApproval: false,
    allowTenants: ['tenant-1', 'tenant-2'],
    roles: ['admin', 'manager'],
    predicate: (context) => {
      // Custom approval logic
      return context?.user !== 'blocked-user';
    },
  },
  mapper: (payload, uiHint) => ({
    type: 'ui.open',
    payload,
    uiHint: { target: 'orderForm', open: true },
  }),
  // OR use executor for async operations
  executor: async (payload, context) => {
    const order = await createOrder(payload);
    return {
      type: 'ui.open',
      payload: { orderId: order.id },
      uiHint: { target: 'orderDetail' },
    };
  },
});
```

**Intent Spec Properties:**

- `type: string` - Unique intent type identifier
- `schema: object` - JSON Schema for payload validation
- `policy?: PolicyConfig` - Approval policy configuration
- `mapper?: (payload, uiHint?) => NIntentResult` - Synchronous result mapper
- `executor?: (payload, context?) => Promise<NIntentResult>` - Async executor function

**Policy Configuration:**

```ts
interface PolicyConfig {
  requiresApproval?: boolean;        // Force approval requirement
  allowTenants?: string[];            // Allowed tenant IDs
  roles?: string[];                   // Required user roles
  predicate?: (context?) => boolean;  // Custom approval predicate
}
```

#### listTypes

Lists all registered intent types.

```ts
import { listTypes } from '@nura-js/intents';

const types = listTypes();
// → [{ type: 'orders.create', schema: {...}, ... }, ...]
```

#### getType

Retrieves a specific intent type specification.

```ts
import { getType } from '@nura-js/intents';

const spec = getType('orders.create');
// → { type: 'orders.create', schema: {...}, ... }
```

### Intent Operations

#### createIntent

Creates a new intent with validation and policy evaluation.

```ts
import { createIntent } from '@nura-js/intents';

const response = await createIntent({
  type: 'orders.create',
  payload: { id: 'o-100', customerId: 'c-123' },
  uiHint: {
    target: 'orderForm',
    open: true,
    focus: 'customerId',
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

**Intent Properties:**

- `type: string` - Intent type (must be registered)
- `payload: unknown` - Intent payload (validated against schema)
- `uiHint?: { open?, target?, focus? }` - UI hints for client-side handling
- `context?: { locale?, tenant?, user?, roles?, ... }` - Execution context

**Response:**

```ts
interface NIntentResponse {
  intentId: string;
  id?: string;              // Alias for intentId
  status: NIntentStatus;    // 'queued' | 'requires_approval' | 'done'
  message?: string;         // Policy reason or error message
  result?: NIntentResult;   // Execution result (if done)
}
```

#### approveIntent

Approves a pending intent and executes it.

```ts
import { approveIntent } from '@nura-js/intents';

const response = await approveIntent('intent-id-123');
// → { intentId: 'intent-id-123', status: 'done', result: {...} }
```

**Behavior:**
- If intent is already done, returns existing result (idempotent)
- Executes intent using mapper or executor
- Updates status to `done`
- Returns execution result

#### executeIntent

Alias for `approveIntent` - executes an intent directly.

```ts
import { executeIntent } from '@nura-js/intents';

const response = await executeIntent('intent-id-123');
```

#### getIntent

Retrieves intent status and result without executing.

```ts
import { getIntent } from '@nura-js/intents';

const response = await getIntent('intent-id-123');
// → { intentId: 'intent-id-123', status: 'requires_approval' | 'done', result?: {...} }
```

#### getIntentResult

Retrieves intent result, throwing if intent is not complete.

```ts
import { getIntentResult } from '@nura-js/intents';

try {
  const result = await getIntentResult('intent-id-123');
  // → { type: 'ui.open', payload: {...}, uiHint: {...} }
} catch (error) {
  // Intent is not complete yet
}
```

## Advanced Usage

### Custom Service Implementation

For custom storage, validation, or policy engines:

```ts
import {
  IntentService,
  InMemoryIntentRegistry,
  AjvSchemaValidator,
  SimplePolicyEngine,
  InMemoryIntentStore,
  ConsoleAuditLogger,
  Hex36IdGenerator,
} from '@nura-js/intents';

const service = new IntentService(
  new InMemoryIntentRegistry(),
  new AjvSchemaValidator(),
  new SimplePolicyEngine(),
  new InMemoryIntentStore(),
  new ConsoleAuditLogger(),
  new Hex36IdGenerator(),
);

// Use service methods directly
await service.createIntent({ type: 'orders.create', payload: {...} });
```

### Custom Validator

Implement custom schema validation:

```ts
import type { SchemaValidator } from '@nura-js/intents';

class CustomValidator implements SchemaValidator {
  validate(schema: object, data: unknown): { ok: boolean; errors?: string[] } {
    // Custom validation logic
    return { ok: true };
  }
}
```

### Custom Policy Engine

Implement custom approval policies:

```ts
import type { PolicyEngine } from '@nura-js/intents';

class CustomPolicyEngine implements PolicyEngine {
  decide(spec, context) {
    // Custom policy logic
    return { status: 'requires_approval', reason: 'custom_reason' };
  }
}
```

### Custom Store

Implement custom intent storage:

```ts
import type { IntentStore } from '@nura-js/intents';

class DatabaseStore implements IntentStore {
  async create(doc: IntentRecord): Promise<{ intentId: string }> {
    // Save to database
    return { intentId: doc.intentId! };
  }
  
  async read(intentId: string): Promise<IntentRecord | null> {
    // Read from database
    return null;
  }
  
  async approve(intentId: string, result: NIntentResult): Promise<void> {
    // Update in database
  }
}
```

### Custom Audit Logger

Implement custom audit logging:

```ts
import type { AuditLogger } from '@nura-js/intents';

class CustomLogger implements AuditLogger {
  info(ev: object): void {
    // Log to external service
  }
  
  warn(ev: object): void {
    // Log warnings
  }
  
  error(ev: object): void {
    // Log errors
  }
}
```

## Error Handling

The package provides specific error classes:

```ts
import {
  IntentError,
  IntentNotFoundError,
  IntentValidationError,
  IntentExecutionError,
  UnknownIntentError,
} from '@nura-js/intents';

try {
  await createIntent({ type: 'unknown.type', payload: {} });
} catch (error) {
  if (error instanceof UnknownIntentError) {
    console.error('Intent type not registered:', error.message);
  } else if (error instanceof IntentValidationError) {
    console.error('Validation errors:', error.errors);
  }
}
```

**Error Types:**

- `IntentError` - Base error class
- `UnknownIntentError` - Intent type not registered
- `IntentValidationError` - Payload validation failed
- `IntentNotFoundError` - Intent ID not found
- `IntentExecutionError` - Execution failed

## Type Reference

### Core Types

- `NIntent` - Intent definition with type, payload, uiHint, and context
- `NIntentSpec` - Intent type specification
- `NIntentStatus` - Status: `'queued' | 'requires_approval' | 'done'`
- `NIntentResponse` - Intent operation response
- `NIntentResult` - Execution result with type, payload, and uiHint

### Service Interfaces

- `IntentRegistry` - Intent type registry
- `SchemaValidator` - Schema validation interface
- `PolicyEngine` - Policy evaluation interface
- `IntentStore` - Intent storage interface
- `AuditLogger` - Audit logging interface
- `IdGenerator` - ID generation interface
- `RateLimiter` - Rate limiting interface
- `IdempotencyStore` - Idempotency key storage

## Additional Resources

- **Repository**: <https://github.com/nura-ia/nurajs>
- **Issues**: <https://github.com/nura-ia/nurajs/issues>
- **Module Documentation**: [docs/modules/intents.md](../../docs/modules/intents.md)
- **API Documentation**: [docs/api/packages/intents.md](../../docs/api/packages/intents.md)
