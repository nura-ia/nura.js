import type { NIntent, PolicyEngine, NIntentSpec, NIntentStatus } from './types.js';

const DEFAULT_STATUS: NIntentStatus = 'queued';

export class SimplePolicyEngine implements PolicyEngine {
  decide(spec: NIntentSpec, ctx?: NIntent['context']): { status: NIntentStatus; reason?: string } {
    if (spec.policy?.requiresApproval) {
      return { status: 'requires_approval', reason: 'policy.requires_approval' };
    }

    if (spec.policy?.allowTenants && spec.policy.allowTenants.length > 0) {
      const tenant = ctx?.tenant;
      if (!tenant || !spec.policy.allowTenants.includes(tenant)) {
        return { status: 'requires_approval', reason: 'policy.tenant_not_allowed' };
      }
    }

    if (spec.policy?.roles && spec.policy.roles.length > 0) {
      const userRoles = Array.isArray(ctx?.roles) ? ctx?.roles : [];
      const isAllowed = spec.policy.roles.some(role => userRoles?.includes(role));
      if (!isAllowed) {
        return { status: 'requires_approval', reason: 'policy.roles_missing' };
      }
    }

    if (spec.policy?.predicate) {
      const decision = spec.policy.predicate(ctx);
      if (!decision) {
        return { status: 'requires_approval', reason: 'policy.custom_blocked' };
      }
    }

    return { status: DEFAULT_STATUS };
  }
}
