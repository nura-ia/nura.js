import { describe, expect, it } from 'vitest';
import { Hex36IdGenerator } from '../src/id-generator.js';

describe('Hex36IdGenerator', () => {
  it('generates unique hex identifiers', () => {
    const generator = new Hex36IdGenerator();
    const first = generator.gen();
    const second = generator.gen();

    expect(first).not.toEqual(second);
    expect(first).toMatch(/^[a-f0-9]{36}$/);
  });
});
