import { describe, expect, it } from 'vitest';
import { AjvSchemaValidator } from '../src/validator.js';

const schema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
  },
  required: ['message'],
  additionalProperties: false,
};

describe('AjvSchemaValidator', () => {
  const validator = new AjvSchemaValidator();

  it('accepts valid payloads', () => {
    const result = validator.validate(schema, { message: 'hello' });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid payloads with errors', () => {
    const result = validator.validate(schema, { message: 42 });
    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain('message');
  });
});
