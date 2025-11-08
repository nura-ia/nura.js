import type { NIntent, NIntentResponse, NIntentResult } from '@nurajs/intents';

export class AiClient {
  constructor(private readonly baseUrl: string, private readonly fetchImpl: typeof fetch = globalThis.fetch) {
    if (!this.fetchImpl) {
      throw new Error('Fetch implementation is required');
    }
  }

  async createIntent(intent: NIntent): Promise<NIntentResponse> {
    return this.send('/ai/intents', {
      method: 'POST',
      body: JSON.stringify(intent),
    });
  }

  async approveIntent(intentId: string): Promise<NIntentResponse> {
    return this.send(`/ai/intents/${encodeURIComponent(intentId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getIntent(intentId: string): Promise<NIntentResponse> {
    return this.send(`/ai/intents/${encodeURIComponent(intentId)}`, {
      method: 'GET',
    });
  }

  async getIntentResult(intentId: string): Promise<NIntentResult> {
    const response = await this.getIntent(intentId);
    if (!response.result) {
      throw new Error('Intent is not complete yet');
    }

    return response.result;
  }

  private async send(path: string, init: RequestInit): Promise<NIntentResponse> {
    const url = new URL(path, ensureTrailingSlash(this.baseUrl));
    const response = await this.fetchImpl(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error('Server responded with an unsupported media type');
    }

    const payload = (await response.json()) as NIntentResponse & { error?: string; message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? payload.error ?? 'Request failed');
    }

    if (!payload.id) {
      payload.id = payload.intentId;
    }

    return payload;
  }
}

export type UiHandler = (payload: unknown, uiHint?: NIntent['uiHint']) => void;

export class UiDispatcher {
  private readonly handlers = new Map<string, UiHandler>();

  register(type: string, fn: UiHandler): void {
    this.handlers.set(type, fn);
  }

  dispatch(result: NIntentResult): void {
    const handler = this.handlers.get(result.type);
    if (handler) {
      handler(result.payload, result.uiHint);
    }
  }
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}
