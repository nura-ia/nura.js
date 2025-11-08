import { AjvSchemaValidator } from './validator.js';
import { ConsoleAuditLogger } from './logger.js';
import { Hex36IdGenerator } from './id-generator.js';
import { InMemoryIntentRegistry } from './registry.js';
import { InMemoryIntentStore } from './store.js';
import { IntentService } from './service.js';
import { SimplePolicyEngine } from './policy.js';
import type { NIntent, NIntentResponse, NIntentResult, NIntentSpec } from './types.js';

const registry = new InMemoryIntentRegistry();
const validator = new AjvSchemaValidator();
const policies = new SimplePolicyEngine();
const store = new InMemoryIntentStore();
const logger = new ConsoleAuditLogger();
const ids = new Hex36IdGenerator();

export const intentService = new IntentService(registry, validator, policies, store, logger, ids);

export function registerType(spec: NIntentSpec): void {
  registry.register(spec);
}

export function listTypes(): NIntentSpec[] {
  return registry.list();
}

export function getType(type: string): NIntentSpec | undefined {
  return registry.get(type);
}

export async function createIntent(intent: NIntent): Promise<NIntentResponse> {
  return intentService.createIntent(intent);
}

export async function approveIntent(intentId: string): Promise<NIntentResponse> {
  return intentService.approveIntent(intentId);
}

export async function executeIntent(intentId: string): Promise<NIntentResponse> {
  return intentService.executeIntent(intentId);
}

export async function getIntent(intentId: string): Promise<NIntentResponse> {
  return intentService.getIntent(intentId);
}

export async function getIntentResult(intentId: string): Promise<NIntentResult> {
  const response = await intentService.getIntent(intentId);
  if (!response.result) {
    throw new Error('Intent is not complete yet');
  }

  return response.result;
}
