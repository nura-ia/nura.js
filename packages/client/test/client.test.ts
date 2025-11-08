import { describe, expect, it, vi } from 'vitest';
import { AiClient, UiDispatcher } from '../src/client.js';

describe('AiClient', () => {
  it('issues JSON requests and parses responses', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ intentId: '1', status: 'done' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = new AiClient('https://api.test', fetchMock);
    const response = await client.createIntent({ type: 'demo', payload: {} });

    expect(response.intentId).toBe('1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = (fetchMock.mock.calls[0] ?? []) as [RequestInfo | URL, RequestInit];
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'application/json' });
  });
});

describe('UiDispatcher', () => {
  it('dispatches results to registered handlers', () => {
    const dispatcher = new UiDispatcher();
    const handler = vi.fn();
    dispatcher.register('demo.result', handler);

    dispatcher.dispatch({ type: 'demo.result', payload: { ok: true } });

    expect(handler).toHaveBeenCalledWith({ ok: true }, undefined);
  });
});
