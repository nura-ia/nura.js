import { describe, expect, it } from 'vitest';
import { InMemoryIntentStore } from '../src/store.js';

const intent = { type: 'demo.intent', payload: { message: 'hi' } };

describe('InMemoryIntentStore', () => {
  it('creates, reads and approves intents', async () => {
    const store = new InMemoryIntentStore();
    const { intentId } = await store.create({ intent, status: 'queued' });

    const stored = await store.read(intentId);
    expect(stored?.status).toBe('queued');

    const result = { type: 'demo.intent.result', payload: { echoed: true } };
    await store.approve(intentId, result);

    const approved = await store.read(intentId);
    expect(approved?.status).toBe('done');
    expect(approved?.result).toEqual(result);
  });
});
