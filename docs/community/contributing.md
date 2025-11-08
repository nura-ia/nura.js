# Contributing to Nura.js

Thanks for your interest in contributing! This guide explains how we collaborate, how to get set up locally, and what we expect from pull requests.

## Getting in Touch

- **Bug reports & feature ideas**: Open an issue on GitHub using the appropriate template.
- **Questions & support**: Start a discussion or review [SUPPORT.md](../../SUPPORT.md).
- **Security reports**: Follow the instructions in [SECURITY.md](./security.md).

## Project Workflow

We track all planned work with GitHub issues. Each change should correspond to an issue before starting implementation.

1. **Discuss** significant changes in an issue or RFC (see [GOVERNANCE.md](./GOVERNANCE.md)).
2. **Fork & branch** from the default branch (`main`). Use short-lived branches named `type/brief-description` (e.g. `feat/add-intent-parser`).
3. **Develop** your changes and keep commits focused.
4. **Open a pull request** referencing the related issue. Fill out the PR template and request review from a maintainer.
5. **Address review feedback** and keep your branch up to date with `main`.

## Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages and PR titles. Common types include:

- `feat`: user-facing feature
- `fix`: bug fix
- `docs`: documentation updates
- `chore`: tooling, configuration, or meta changes
- `refactor`, `perf`, `test`, `build`, `ci`

Scope is optional but encouraged for packages (e.g. `feat(core): add slot validator`).

## Development Environment

Nura.js is a pnpm monorepo built with TypeScript and ESM.

### Requirements

- Node.js ≥ 18.18
- pnpm ≥ 8 (via [Corepack](https://nodejs.org/api/corepack.html))

### Setup

```bash
pnpm i -g corepack
corepack enable
pnpm install
```

### Useful Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run all apps/packages in development mode via TurboRepo |
| `pnpm -r build` | Build every package in topological order |
| `pnpm -r test` | Execute tests for all workspaces |
| `pnpm -r lint` | Run linting across all workspaces |
| `pnpm format` | Format source and documentation with Prettier |
| `pnpm changeset` | Create a Changeset for release notes |

See workspace-level `package.json` files for additional scripts.

## Testing Guidelines

- Include automated tests for new features whenever possible.
- Ensure `pnpm -r test`, `pnpm -r build`, and `pnpm -r lint` pass before requesting review.
- Document manual verification steps in the PR template if automated tests are not feasible.

## Pull Request Checklist

Before requesting a review, please confirm:

- [ ] Tests and builds pass locally.
- [ ] Linting runs without errors.
- [ ] Documentation is updated (README, docs, examples).
- [ ] Breaking changes are clearly documented, including migration steps.
- [ ] You have added a Changeset when the change affects published packages.

## Code Style

- TypeScript strict mode is required; do not disable compiler checks.
- Prefer small, composable modules and follow SOLID principles.
- Avoid introducing new runtime dependencies without prior discussion.

## Release Process

We follow [Semantic Versioning](https://semver.org/) and publish releases using Changesets.

1. Contributors create a Changeset with `pnpm changeset` describing the change and bump type.
2. The automated release workflow opens a release PR summarizing pending changes.
3. Once approved, the release PR is merged and the workflow tags a new version and publishes to npm.

Thanks for helping us make Nura.js better!
