export interface NIntent {
  type: string;
  payload: unknown;
  uiHint?: {
    open?: boolean;
    target?: string;
    focus?: string;
  };
  context?: {
    locale?: string;
    tenant?: string;
    user?: string;
    roles?: string[];
    [key: string]: unknown;
  };
}

export type NIntentStatus = 'queued' | 'requires_approval' | 'done';

export interface NIntentResult {
  type: string;
  payload: unknown;
  uiHint?: NIntent['uiHint'];
}

export interface NIntentResponse {
  intentId: string;
  id?: string;
  status: NIntentStatus;
  message?: string;
  result?: NIntentResult;
}

export interface NIntentSpec {
  type: string;
  schema: object;
  policy?: {
    requiresApproval?: boolean;
    allowTenants?: string[];
    roles?: string[];
    predicate?: (context?: NIntent['context']) => boolean;
  };
  mapper?: (payload: unknown, uiHint?: NIntent['uiHint']) => NIntentResult;
  executor?: (payload: unknown, ctx?: NIntent['context']) => Promise<NIntentResult>;
}

export interface IntentRegistry {
  register(spec: NIntentSpec): void;
  get(type: string): NIntentSpec | undefined;
  list(): NIntentSpec[];
}

export interface SchemaValidator {
  validate(schema: object, data: unknown): { ok: boolean; errors?: string[] };
}

export interface PolicyEngine {
  decide(spec: NIntentSpec, ctx?: NIntent['context']): {
    status: NIntentStatus;
    reason?: string;
  };
}

export interface IntentRecord {
  intentId?: string;
  intent: NIntent;
  status: NIntentStatus;
  result?: NIntentResult;
}

export interface IntentStore {
  create(doc: IntentRecord): Promise<{ intentId: string }>;
  read(intentId: string): Promise<IntentRecord | null>;
  approve(intentId: string, result: NIntentResult): Promise<void>;
}

export interface AuditLogger {
  info(ev: object): void;
  warn(ev: object): void;
  error(ev: object): void;
}

export interface IdGenerator {
  gen(): string;
}

export interface RateLimiter {
  check(key: string): Promise<boolean>;
}

export interface IdempotencyStore {
  get(key: string): Promise<NIntentResponse | null>;
  set(key: string, resp: NIntentResponse, ttlSec: number): Promise<void>;
}
