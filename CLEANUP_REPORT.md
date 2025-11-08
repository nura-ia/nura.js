# Cleanup Report

## Modified Files

- Tooling: `.eslintrc.cjs`, `.prettierrc.json`, `typedoc.json`, `package.json` scripts.
- Documentation: root `README.md`, new `CHANGELOG.md`, `RELEASING.md`, package
  READMEs for `@nura/core`, `@nura/plugin-voice`, `@nura/plugin-fuzzy`, and
  `@nura/vue`.
- Build configs: `rollup.config.js` and `tsconfig.build.json` for core, voice,
  fuzzy, and vue packages.
- Source updates: `packages/core/src/*` telemetry, lexicon, i18n, actions;
  `packages/plugin-voice/src/index.ts` for typing and messaging improvements.

## Change Categories

### Tooling & Build

- Unified linting and formatting rules with strict TypeScript enforcement.
- Migrated package builds from `tsup` to Rollup with declaration bundling.
- Added Typedoc configuration and npm scripts for API documentation generation.

### Documentation

- Authored package-level READMEs with API references, usage examples, and status.
- Introduced project-wide changelog and releasing guide aligned with semantic versioning.
- Updated the main README to include documentation build instructions.

### Type Safety & Naming

- Replaced `any` usage in telemetry, action catalog, and registry helpers with
  precise types.
- Standardised telemetry payload handling and ensured English-only runtime
  strings for accessibility.

## Functional Parity

These changes focus on tooling, documentation, and type safety. Runtime logic
and public APIs remain unchanged beyond improved typing and messaging clarity.
