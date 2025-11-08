# Changelog

All notable changes to this project will be documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Standardised ESLint, Prettier, and EditorConfig rules across packages.
- Rollup build pipelines with type declarations for `@nura/core`,
  `@nura/plugin-voice`, `@nura/plugin-fuzzy`, and `@nura/vue`.
- Package-level README files detailing APIs, configuration, and status.
- Typedoc configuration for generating HTML API documentation under `docs/api`.
- `CLEANUP_REPORT.md` summarising repository-wide refactors.

### Changed

- Hardened telemetry, lexicon, and i18n typings to avoid `any` usage.
- Normalised in-source comments and prompts to English for consistency.

### Removed

- Legacy `tsup` build scripts replaced with Rollup equivalents.
