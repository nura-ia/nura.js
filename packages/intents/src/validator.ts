import Ajv, { type ErrorObject } from 'ajv';
import type { SchemaValidator } from './types.js';

const ajv = new Ajv({ allErrors: true, strict: true });
const compiledCache = new WeakMap<object, ReturnType<typeof ajv.compile>>();

export class AjvSchemaValidator implements SchemaValidator {
  validate(schema: object, data: unknown): { ok: boolean; errors?: string[] } {
    const compiled = this.getCompiled(schema);
    const valid = compiled(data);

    if (valid) {
      return { ok: true };
    }

    return {
      ok: false,
      errors: (compiled.errors ?? []).map(formatAjvError),
    };
  }

  private getCompiled(schema: object) {
    const cached = compiledCache.get(schema);
    if (cached) {
      return cached;
    }

    const compiled = ajv.compile(schema);
    compiledCache.set(schema, compiled);
    return compiled;
  }
}

function formatAjvError(error: ErrorObject): string {
  const path = error.instancePath || error.schemaPath;
  const message = error.message ?? 'is invalid';
  return `${path} ${message}`.trim();
}
