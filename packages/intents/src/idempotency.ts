import type { IdempotencyStore, NIntentResponse } from './types.js';

interface Entry {
  response: NIntentResponse;
  expiresAt: number;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, Entry>();

  async get(key: string): Promise<NIntentResponse | null> {
    this.prune();
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return structuredClone(entry.response);
  }

  async set(key: string, resp: NIntentResponse, ttlSec: number): Promise<void> {
    const expiresAt = Date.now() + ttlSec * 1000;
    this.store.set(key, { response: structuredClone(resp), expiresAt });
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
