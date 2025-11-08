import {
  IntentExecutionError,
  IntentNotFoundError,
  IntentValidationError,
  UnknownIntentError,
} from './errors.js';
import type {
  AuditLogger,
  IdGenerator,
  IntentRegistry,
  IntentStore,
  NIntent,
  NIntentResponse,
  NIntentResult,
  NIntentSpec,
  PolicyEngine,
  SchemaValidator,
} from './types.js';

export class IntentService {
  constructor(
    private readonly registry: IntentRegistry,
    private readonly validator: SchemaValidator,
    private readonly policies: PolicyEngine,
    private readonly store: IntentStore,
    private readonly log: AuditLogger,
    private readonly ids: IdGenerator,
  ) {}

  async createIntent(input: NIntent): Promise<NIntentResponse> {
    const intentId = this.ids.gen();
    const spec = this.registry.get(input.type);
    if (!spec) {
      this.log.warn({ event: 'intent.create.unknown_type', type: input.type });
      throw new UnknownIntentError(input.type);
    }

    const validation = this.validator.validate(spec.schema, input.payload);
    if (!validation.ok) {
      this.log.warn({ event: 'intent.create.invalid', type: input.type, errors: validation.errors });
      throw new IntentValidationError(validation.errors ?? []);
    }

    const decision = this.policies.decide(spec, input.context);
    await this.store.create({ intentId, intent: input, status: decision.status });
    this.log.info({ event: 'intent.create.persisted', intentId, type: input.type, status: decision.status });

    if (decision.status === 'requires_approval') {
      return {
        intentId,
        id: intentId,
        status: 'requires_approval',
        message: decision.reason,
      };
    }

    const result = await this.resolveResult(spec, input, intentId);
    await this.store.approve(intentId, result);
    this.log.info({ event: 'intent.create.executed', intentId, type: input.type });
    return { intentId, id: intentId, status: 'done', result };
  }

  async approveIntent(intentId: string): Promise<NIntentResponse> {
    const existing = await this.store.read(intentId);
    if (!existing) {
      this.log.warn({ event: 'intent.approve.missing', intentId });
      throw new IntentNotFoundError(intentId);
    }

    if (existing.status === 'done' && existing.result) {
      this.log.info({ event: 'intent.approve.idempotent', intentId });
      return { intentId, id: intentId, status: 'done', result: existing.result };
    }

    const spec = this.requireSpec(existing.intent.type);
    const result = await this.resolveResult(spec, existing.intent, intentId);
    await this.store.approve(intentId, result);
    this.log.info({ event: 'intent.approve.completed', intentId, type: existing.intent.type });
    return { intentId, id: intentId, status: 'done', result };
  }

  async getIntent(intentId: string): Promise<NIntentResponse> {
    const existing = await this.store.read(intentId);
    if (!existing) {
      this.log.warn({ event: 'intent.read.missing', intentId });
      throw new IntentNotFoundError(intentId);
    }

    return {
      intentId,
      id: intentId,
      status: existing.status,
      ...(existing.result ? { result: existing.result } : {}),
    };
  }

  async executeIntent(intentId: string): Promise<NIntentResponse> {
    return this.approveIntent(intentId);
  }

  private requireSpec(type: string): NIntentSpec {
    const spec = this.registry.get(type);
    if (!spec) {
      this.log.error({ event: 'intent.spec.missing', type });
      throw new UnknownIntentError(type);
    }

    return spec;
  }

  private async resolveResult(spec: NIntentSpec, intent: NIntent, intentId: string): Promise<NIntentResult> {
    try {
      if (spec.executor) {
        return await spec.executor(intent.payload, intent.context);
      }

      if (spec.mapper) {
        return spec.mapper(intent.payload, intent.uiHint);
      }

      return {
        type: spec.type,
        payload: intent.payload,
        uiHint: intent.uiHint,
      };
    } catch (error) {
      this.log.error({ event: 'intent.execution.failed', intentId, type: spec.type, error });
      throw new IntentExecutionError(intentId, error);
    }
  }
}
