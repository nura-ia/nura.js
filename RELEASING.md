# Releasing Nura.js

This document describes the release process for the Nura.js monorepo. All
packages are published to npm from the `main` branch using
[Changesets](https://github.com/changesets/changesets).

## Prerequisites

- You have access to the `nura` npm organisation.
- You can trigger GitHub Actions workflows for this repository.
- The local environment has Node.js ≥ 18.18 and pnpm ≥ 8 with Corepack enabled.

## Release Checklist

1. **Verify quality gates**
   - Run `pnpm install` to ensure lockfile consistency.
   - Execute `pnpm run lint`, `pnpm run build`, and `pnpm run test`.
   - Generate API docs with `pnpm run build:docs` and confirm `docs/api/` updates
     are committed.
2. **Collect changes**
   - Run `pnpm changeset status` to review pending releases.
   - If changes are missing, create new entries using `pnpm changeset`.
3. **Version bump**
   - Execute `pnpm changeset version` on the `main` branch. This updates package
     versions, changelogs, and the lockfile.
4. **Publish**
   - Commit the version bump and push to GitHub.
   - Run `pnpm changeset publish` to publish all packages to npm. This command
     respects the versions generated in the previous step.
5. **Post-release**
   - Tag the release in GitHub if the workflow did not already do so.
   - Share release notes in community channels.

## Automation Notes

- CI enforces linting, tests, and type checks before allowing merges into `main`.
- The `release` script defined in `package.json` runs the full versioning and
  publication flow: `pnpm changeset version && pnpm run build && changeset publish`.
- Ensure `docs/api/` output is regenerated whenever public APIs change so that
documentation stays in sync with the published packages.
