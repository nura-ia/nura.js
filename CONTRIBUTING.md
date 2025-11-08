# Contributing to Nura.js

Thanks for helping make Nura.js better. This guide explains how to set up your environment, follow the workflow, and ship changes confidently.

## Requirements

- Node.js ≥ 18.18 (use `corepack enable` to manage versions)
- pnpm ≥ 8 (Corepack-managed)

## Monorepo Overview

```
apps/                # Demo surfaces and verification apps
packages/core        # Wake helpers, numerals, synonyms, context manager
packages/intents     # Intent → Approval → Execute engine
packages/transport-* # Secure transports (HTTP and future adapters)
packages/client      # Unified SDK + UI dispatcher
packages/react|vue|svelte # Framework adapters
scripts/             # Tooling, smoke tests, release helpers
```

## Branching Model

- `main` — stable, release-ready code
- `feat/*` — new features or docs improvements
- `fix/*` — patches and hotfixes

Always branch from `main` and rebase before opening a pull request.

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/). Keep messages concise and descriptive.

Examples:

- `feat: add italian numerals map`
- `fix: guard wake matcher on empty input`
- `docs: refresh quick start instructions`

## Pull Request Checklist

Before you request a review:

- [ ] `pnpm -w run typecheck`
- [ ] `pnpm -w run build`
- [ ] `pnpm run smoke`
- [ ] `pnpm run verify:release`
- [ ] Ensure linting passes (e.g., `pnpm lint` if applicable)
- [ ] Update docs/tests when behavior changes

## Code Style

- TypeScript strict mode is enforced across packages.
- No unused exports — remove dead code as part of your change.
- Prefer small, composable functions and explicit return types.

## Testing Commands

Use the workspace scripts from the repo root:

```bash
pnpm -w run typecheck
pnpm -w run build
pnpm run smoke
pnpm run verify:release
```

## Getting Help

Open a discussion on GitHub or ping the maintainers in Discord (#).
