import { randomBytes } from 'node:crypto';
import type { IdGenerator } from './types.js';

export class Hex36IdGenerator implements IdGenerator {
  gen(): string {
    return randomBytes(18).toString('hex');
  }
}
