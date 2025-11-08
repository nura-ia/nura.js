import { randomUUID } from 'node:crypto';
import type { IntentRecord, IntentStore, NIntentResult } from './types.js';

interface StoredRecord {
  intentId: string;
  intent: IntentRecord['intent'];
  status: IntentRecord['status'];
  result?: IntentRecord['result'];
}

export class InMemoryIntentStore implements IntentStore {
  private readonly intents = new Map<string, StoredRecord>();

  async create(doc: IntentRecord): Promise<{ intentId: string }> {
    const intentId = doc.intentId ?? randomUUID();
    const record: StoredRecord = {
      intentId,
      intent: structuredClone(doc.intent),
      status: doc.status,
      result: doc.result ? structuredClone(doc.result) : undefined,
    };
    this.intents.set(intentId, record);
    return { intentId };
  }

  async read(intentId: string): Promise<IntentRecord | null> {
    const record = this.intents.get(intentId);
    if (!record) {
      return null;
    }

    return {
      intentId: record.intentId,
      intent: structuredClone(record.intent),
      status: record.status,
      result: record.result ? structuredClone(record.result) : undefined,
    };
  }

  async approve(intentId: string, result: NIntentResult): Promise<void> {
    const record = this.intents.get(intentId);
    if (!record) {
      return;
    }

    record.status = 'done';
    record.result = structuredClone(result);
    this.intents.set(intentId, record);
  }
}
