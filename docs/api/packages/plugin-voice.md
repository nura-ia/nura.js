# @nura/plugin-voice

> Voice command agent for Nura.js registries with wake-word detection and fuzzy matching.

## Installation

```bash
pnpm add @nura/plugin-voice @nura/core
# or
yarn add @nura/plugin-voice @nura/core
```

## Usage

```ts
import { voiceAgent } from '@nura/plugin-voice'
import { Nura, createRegistry } from '@nura/core'

const registry = createRegistry({
  config: { app: { id: 'demo-app' } },
})

const agent = voiceAgent({
  wakeWords: ['hey nura'],
  autoStart: true,
})

const nura = new Nura({ registry })
await agent.start({
  registry,
  act: (action) => nura.act(action),
  select: () => [],
  i18n: registry.i18n,
  lexicon: registry.lexicon,
})
```

## API

### `voiceAgent(options?)`

Returns an `NAgent` compatible object that wires the Web Speech API to registry
intents. It emits telemetry events under `voice.*` channels.

#### Options

| Option | Type | Description |
| --- | --- | --- |
| `wakeWords` | `string[] \| WakeWordConfig[]` | Custom wake words with optional aliases and minimum confidence. |
| `intents` | `NIntent[]` | Additional intents beyond those derived from registry specs. |
| `language` | `string` | Explicit locale override for speech recognition. |
| `keyWake` | `string` | Keyboard shortcut to open a dev prompt fallback. |
| `autoStart` | `boolean` | Automatically call `start()` when the agent is initialised. |
| `devMode` | `boolean` | Keeps matched actions from executing and surfaces debug telemetry. |

### Utility Exports

- `matchUtterance(ctx, utterance, intents, options)` – fuzzy ranking pipeline
  used internally; exposed for custom UIs.
- `detectWake`, `normalizeWakeWords`, `stripWake` – wake word helpers.
- `detectLocale(text, candidates)` – heuristically select the most likely
  locale for an utterance.

## Telemetry Events

Key telemetry channels emitted during processing:

- `voice.input` – raw transcription payload.
- `voice.wake.fuzzy` – wake-word detection diagnostics.
- `voice.locale.detected` – selected locale and candidates.
- `voice.intents.derived` – count of intents derived from registry specs.
- `voice.intent.selected` / `voice.intent.rejected` – match outcomes.

## Dependencies

- Internal: `@nura/core`, `@nura/plugin-fuzzy`.
- External: Web Speech API (browser environments), falls back to prompt-based
  mock in development.

## Status

**Experimental.** APIs and heuristics may change prior to v1.0. See the global
[`CHANGELOG.md`](../../CHANGELOG.md) for updates.
