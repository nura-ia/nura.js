# @nura/plugin-voice

Voice agent for Nura.js with wake-word comparison, locale detection, and intent scoring.

## Installation

```bash
pnpm add @nura/plugin-voice
```

## Usage Example

```ts
import { createRegistry, defineActionSpec } from '@nura/core';
import { voiceAgent } from '@nura/plugin-voice';

const registry = createRegistry({
  actions: [
    defineActionSpec({
      name: 'open_orders',
      type: 'open',
      target: 'orders',
      phrases: {
        'es-CR': { canonical: ['abre órdenes'], wake: ['hey nura'] },
      },
    }),
  ],
  agents: [voiceAgent({ wakeWords: ['hey nura'] })],
});

registry.agents.start('voice', {
  locale: 'es-CR',
  intents: registry.actions.intents(),
});
```

## Key APIs

- `voiceAgent` wires recognition, wake configuration, and event emission into a registry.
- `matchUtterance` scores intents based on phonetic and edit-distance comparisons.
- `compareWakeWord` compares phrases for wake-word confidence.
- `stripWake` and `detectLocale` are re-exported from `@nura/core` for convenience.

## Type References

- `NVoiceOptions` — configuration for the agent (wake words, thresholds, debug mode).
- `WakeWordInput` — normalized structure for wake-word checks.
- `NIntent` — registry intent ready for recognition.
- `IntentMatchResult` — detailed result from `matchUtterance` including scores and tokens.

## Additional Resources

- Repository: <https://github.com/nura-ia/nurajs>
- Issues: <https://github.com/nura-ia/nurajs/issues>
