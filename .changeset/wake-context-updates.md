---
"@nura/core": minor
"@nura/plugin-voice": minor
"@nura/plugin-fuzzy": patch
"@nura/dom": patch
"@nura/vue": patch
"@nura/react": patch
"@nura/svelte": patch
---
- Add official subpath exports (wake/context/locale/numerals/synonyms), robust tokenized wake stripping, context confirmations, improved locale detection and numerals parsing in `@nura/core`.
- Consume and align with the core wake/context APIs and expose `compareWakeWord` in `@nura/plugin-voice`.
- Clean up build/exports, refresh docs, and ensure compatibility with the new core subpaths across `@nura/plugin-fuzzy`, `@nura/dom`, `@nura/vue`, `@nura/react`, and `@nura/svelte`.
