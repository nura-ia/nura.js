# @nura/plugin-fuzzy

> Locale-aware fuzzy string utilities used across the Nura.js ecosystem.

## Installation

```bash
pnpm add @nura/plugin-fuzzy
# or
yarn add @nura/plugin-fuzzy
```

## Usage

```ts
import { matchFuzzy } from '@nura/plugin-fuzzy'

const result = matchFuzzy('open the cart', ['open the cart', 'close the cart'])

console.log(result)
// { value: 'open the cart', score: 1, strategy: 'hybrid', matchedTokens: [...] }
```

## API

### `matchFuzzy(input, candidates, options?)`

Returns the best `MatchResult` using Damerau–Levenshtein distance combined with
phonetic heuristics.

- `input`: Raw string to match.
- `candidates`: Array of strings to compare against.
- `options.strategy`: `'damerau' | 'soundex' | 'double-metaphone' | 'hybrid'`.
- `options.minConfidence`: Minimum score (0–1) required for a match.
- `options.locale`: `'es' | 'en'` locale hint for phonetic hashing.

### Lower-Level Helpers

- `damerauLevenshteinSimilarity(a, b)` – normalized distance metric.
- `compareWakeWord(input, wake, options)` – evaluate wake phrases with
  phonetic and edit distance checks.
- `tokenizeAndScore(input, candidates, options)` – produce per-token scores for
  downstream ranking.
- `soundexLikeEsEn(value, locale)` – phonetic hashing tuned for Spanish/English.
- `doubleMetaphoneLite(value, locale)` – simplified metaphone variant.

All helpers are tree-shakeable and ship TypeScript definitions alongside the ESM
bundle.

## Dependencies

- Internal: none.
- External: none (pure TypeScript implementation).

## Status

**Stable.** Algorithms are covered by unit tests and changes follow semver in
[`CHANGELOG.md`](../../CHANGELOG.md).
