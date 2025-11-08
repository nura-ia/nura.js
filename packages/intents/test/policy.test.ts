import { describe, expect, it } from 'vitest';
import { SimplePolicyEngine } from '../src/policy.js';

const spec = {
  type: 'demo.intent',
  schema: {},
};

describe('SimplePolicyEngine', () => {
  const policies = new SimplePolicyEngine();

  it('returns queued when no policy present', () => {
    expect(policies.decide(spec).status).toBe('queued');
  });

  it('requires approval when flag is set', () => {
    const decision = policies.decide({ ...spec, policy: { requiresApproval: true } });
    expect(decision.status).toBe('requires_approval');
  });

  it('requires approval when roles do not match', () => {
    const decision = policies.decide({ ...spec, policy: { roles: ['admin'] } }, { roles: ['user'] });
    expect(decision.status).toBe('requires_approval');
  });

  it('allows execution when role matches', () => {
    const decision = policies.decide({ ...spec, policy: { roles: ['admin'] } }, { roles: ['admin'] });
    expect(decision.status).toBe('queued');
  });
});
