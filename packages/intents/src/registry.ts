import type { IntentRegistry, NIntentSpec } from './types.js';

export class InMemoryIntentRegistry implements IntentRegistry {
  private readonly specs = new Map<string, NIntentSpec>();

  register(spec: NIntentSpec): void {
    this.specs.set(spec.type, spec);
  }

  get(type: string): NIntentSpec | undefined {
    return this.specs.get(type);
  }

  list(): NIntentSpec[] {
    return Array.from(this.specs.values());
  }
}
