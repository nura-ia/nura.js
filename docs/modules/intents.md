# @nurajs/intents
**Purpose:** Securely describe and execute AI-driven actions via JSON Intents using the IAE flow: **Intent → Approval → Execute**.

## Core API
- `registerType({ type, schema, policy, mapper, executor })`
- `listTypes()`, `getType(type)`, `getIntent(id)`, `getIntentResult(id)`
- `createIntent(input)`, `approveIntent(id)`, `executeIntent(id)`

## Policies
- `requiresApproval`, `allowTenants`, role gates, custom predicates

## Example
```ts
registerType({
  type: 'inventory.add',
  schema: { type:'object', required:['name'], properties:{ name:{type:'string'} } },
  policy: { requiresApproval: false },
  mapper: payload => ({ type:'ui.toast', payload, uiHint:{ variant:'success', text:`Item ${payload.name} added` } }),
  executor: async payload => addItem(payload)
})
```
