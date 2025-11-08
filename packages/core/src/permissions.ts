import { type NPermissions, type NActor, type NPermissionRule, type NPolicy } from './types'

export function hasRole(rule?: NPermissionRule, actor?: NActor): boolean {
  if (!rule?.roles || rule.roles.length === 0) return true
  const roles = new Set(actor?.roles ?? [])
  return rule.roles.some((r) => roles.has(r))
}

export function decidePolicy(rule?: NPermissionRule): NPolicy {
  if (rule?.policy) return rule.policy
  if (rule?.confirm) return 'confirm'
  return 'allow'
}

export function pickRule(
  permissions: NPermissions | undefined,
  scope?: string,
  actionType?: string,
): NPermissionRule | undefined {
  if (!permissions || !scope || !actionType) return undefined
  return permissions.scopes?.[scope]?.[actionType]
}
