# @nura/dom

DOM indexer utilities that locate Nura verbs, scopes, and metadata directly in the browser.

## Installation

```bash
pnpm add @nura/dom
```

## Usage Example

```ts
import { DOMIndexer, scanDOM } from '@nura/dom';

const indexer = new DOMIndexer({ autoScan: true });
const indexed = indexer.getAll();
console.log('Indexed elements', indexed.length);

const snapshot = scanDOM(document.body);
console.log(snapshot.stats.byScope.orders);
```

## Key APIs

- `DOMIndexer` observes the DOM and maintains a reactive index for `data-nu-*` attributes.
- `scanDOM(root?)` performs an ad-hoc scan and returns metrics grouped by scope and verb.
- `findElementsByScope(scope)` finds elements by scope name.
- `findElementsByVerb(verb)` returns elements bound to a specific verb.

## Type References

- `DOMIndexerOptions` — configuration for auto-scan and observers.
- `ScanResult` — output from `scanDOM` with stats and node collections.
- `NuraElement` — indexed element model compatible with `@nura/core`.

## Additional Resources

- Repository: <https://github.com/nura-ia/nurajs>
- Issues: <https://github.com/nura-ia/nurajs/issues>
