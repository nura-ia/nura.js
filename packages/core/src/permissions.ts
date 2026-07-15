import type {
  NAction,
  NActor,
  NPermissionRule,
  NPermissions,
  NPolicy,
} from './types'

export interface NPermissionDecision {
  allowed: boolean
  policy: NPolicy
  reason?: string
  rule?: NPermissionRule
}

export interface EvaluatePermissionOptions {
  permissions: NPermissions
  scope?: string
  actionType?: string
  actor?: NActor
  action?: NAction
  defaultPolicy?: NPolicy
}

export function decidePolicy(
  rule: NPermissionRule | undefined,
  fallback: NPolicy = 'allow',
): NPolicy {
  if (!rule) return fallback
  if (rule.confirm) return 'confirm'
  return rule.policy ?? 'allow'
}

export function hasRole(
  rule: NPermissionRule | undefined,
  actor: NActor | undefined,
): boolean {
  if (!rule?.roles?.length) return true
  if (!actor?.roles?.length) return false
  return rule.roles.some((role) => actor.roles?.includes(role))
}

export function pickRule(
  permissions: NPermissions,
  scope?: string,
  actionType?: string,
): NPermissionRule | undefined {
  if (!scope || !actionType) return undefined
  return permissions.scopes[scope]?.[actionType]
}

export async function evaluatePermission(
  options: EvaluatePermissionOptions,
): Promise<NPermissionDecision> {
  const fallback = options.defaultPolicy ?? 'allow'
  const rule = pickRule(options.permissions, options.scope, options.actionType)
  const policy = decidePolicy(rule, fallback)

  if (!hasRole(rule, options.actor)) {
    return { allowed: false, policy, reason: 'forbidden:role', rule }
  }

  if (rule?.condition) {
    try {
      const allowed = await rule.condition({
        actor: options.actor,
        action: options.action,
        scope: options.scope,
        actionType: options.actionType,
      })
      if (!allowed) {
        return {
          allowed: false,
          policy,
          reason: 'forbidden:condition',
          rule,
        }
      }
    } catch {
      return {
        allowed: false,
        policy,
        reason: 'forbidden:condition',
        rule,
      }
    }
  }

  if (policy === 'deny') {
    return { allowed: false, policy, reason: 'forbidden:policy', rule }
  }

  return { allowed: true, policy, rule }
}
