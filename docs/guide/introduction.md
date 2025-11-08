# Nura.js

[![CI](https://github.com/nura-ia/nurajs/actions/workflows/ci.yml/badge.svg)](https://github.com/nura-ia/nurajs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@nura/core?label=%40nura%2Fcore)](https://www.npmjs.com/package/@nura/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](../../LICENSE)

Nura.js keeps agent expectations aligned with your UI across React, Vue, and Svelte. The toolkit offers fuzzy matching, wake-word
helpers, and contextual confirmation utilities built on a strict TypeScript core.

## Highlights

- Intent metadata that agents and automations can reason about.
- Wake-word stripping, locale detection, numeral parsing, and synonym normalization.
- React, Vue, and Svelte adapters powered by one shared runtime.
- Tooling for verification, accessibility, and release hygiene.

## Quick Start

```bash
pnpm add @nura/core
pnpm add @nura/plugin-voice @nura/plugin-fuzzy  # optional packages
```

Pick an adapter when integrating with a UI framework:

```bash
pnpm add @nura/react  # or: pnpm add @nura/vue / pnpm add @nura/svelte
```

Install dependencies when working on the monorepo:

```bash
pnpm install
pnpm dev  # or: npm run dev / yarn dev
```

### Hello Nura example (React)

```tsx
import { NuraProvider, useNuraCommand } from '@nura/react';

export function App() {
  useNuraCommand('open-cart', ({ context }) => {
    console.log('Opening cart for', context?.userId);
  });

  return (
    <NuraProvider>
      <button data-nura-command="open-cart">Open cart</button>
    </NuraProvider>
  );
}
```

## Compatibility

- Node.js 18.18+ (ESM)
- TypeScript 5.x with `strict` mode enabled
- React 18/19, Vue 3, and Svelte 4/5 adapters maintained in-tree

## Documentation Map

- [Getting Started](./getting-started.md)
- [Architecture Overview](../internals/architecture.md)
- [Recipes and Examples](../tutorials/recipes.md)
- [Community Guides](../community/index.md)
- [API Reference](../api/index.md)

Generate local API docs with:

```bash
pnpm run build:docs
```

## Project Status

- Maturity: **Alpha** — APIs may change while we gather feedback.
- Quarterly goals live in [docs/community/roadmap.md](../community/roadmap.md).

## Contributing

Read [docs/community/contributing.md](../community/contributing.md) for branching strategy, review expectations, and
Conventional Commit guidance.

## Security

Report vulnerabilities privately to [security@nura.dev](mailto:security@nura.dev). See
[docs/community/security.md](../community/security.md) for supported versions and disclosure timelines.

## Support

Open a GitHub Discussion or issue. See [../../SUPPORT.md](../../SUPPORT.md) for the support policy.

## License

Released under the [MIT License](../../LICENSE).
