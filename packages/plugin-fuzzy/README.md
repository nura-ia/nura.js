# @nura/plugin-fuzzy

Fuzzy, phonetic, and token-based matching utilities shared by Nura.js and its voice tooling.

## Installation

```bash
pnpm add @nura/plugin-fuzzy
```

## Usage Example

```ts
import { matchFuzzy, tokenizeAndScore, compareWakeWord } from '@nura/plugin-fuzzy';

const brands = ['Nura', 'Núria', 'Nero'];
const match = matchFuzzy('nura', brands, { locale: 'es' });

const tokens = tokenizeAndScore('abre el modo noche', ['modo noche', 'modo día']);

const wake = compareWakeWord('hey nura', {
  canonical: 'hey nura',
  aliases: ['hola nura'],
});
```

## Key APIs

- `matchFuzzy` scores candidates using the selected strategy and locale heuristics.
- `tokenizeAndScore` evaluates each token against candidate phrases.
- `compareWakeWord` checks wake-word candidates for hybrid phonetic similarity.
- `damerauLevenshteinSimilarity` exposes the raw edit-distance helper.

## Type References

- `FuzzyMatchOpts` — strategy, locale, and threshold options.
- `MatchResult` — output from `matchFuzzy` including the winning candidate.
- `TokenScore` — granular token scoring result used by `tokenizeAndScore`.
- `FuzzyStrategy` — supported strategies (`'hybrid'`, `'damerau'`, ...).

## Additional Resources

- Repository: <https://github.com/nura-ia/nurajs>
- Issues: <https://github.com/nura-ia/nurajs/issues>
