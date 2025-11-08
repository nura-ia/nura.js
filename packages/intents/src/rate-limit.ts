import type { RateLimiter } from './types.js';

export class NoopRateLimiter implements RateLimiter {
  async check(): Promise<boolean> {
    return true;
  }
}
