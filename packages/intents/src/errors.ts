export class IntentError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = this.constructor.name;
  }
}

export class UnknownIntentError extends IntentError {
  constructor(type: string) {
    super('unknown_intent', `Unknown intent type: ${type}`, 422);
  }
}

export class IntentValidationError extends IntentError {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super('invalid_intent', 'Intent payload failed validation', 422, { errors });
    this.errors = errors;
  }
}

export class IntentNotFoundError extends IntentError {
  constructor(intentId: string) {
    super('intent_not_found', `Intent ${intentId} was not found`, 404);
  }
}

export class IntentAlreadyApprovedError extends IntentError {
  constructor(intentId: string) {
    super('intent_already_done', `Intent ${intentId} is already done`, 409);
  }
}

export class IntentExecutionError extends IntentError {
  constructor(intentId: string, cause: unknown) {
    super('intent_execution_failed', `Failed to execute intent ${intentId}`, 500, { cause });
  }
}
