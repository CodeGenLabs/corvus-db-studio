export type CorvusSystemRole = 'admin' | 'dba' | 'developer' | 'analyst' | 'viewer'

export interface ConnectionAclRule {
  connectionId: string
  allowedRoles: CorvusSystemRole[]
  readOnly?: boolean
}

export class RbacGuardManager {
  private static roleRank: Record<CorvusSystemRole, number> = {
    admin: 5,
    dba: 4,
    developer: 3,
    analyst: 2,
    viewer: 1,
  }

  public static hasPermission(
    userRole: CorvusSystemRole,
    requiredRole: CorvusSystemRole,
  ): boolean {
    return (this.roleRank[userRole] || 0) >= (this.roleRank[requiredRole] || 0)
  }

  public static canAccessConnection(
    userRole: CorvusSystemRole,
    connectionId: string,
    aclRules: ConnectionAclRule[],
  ): { allowed: boolean; readOnly: boolean } {
    if (userRole === 'admin') {
      return { allowed: true, readOnly: false }
    }

    const rule = aclRules.find((r) => r.connectionId === connectionId)
    if (!rule) {
      // Default: accessible if developer or above, read-only for analyst/viewer
      return {
        allowed: true,
        readOnly: userRole === 'viewer' || userRole === 'analyst',
      }
    }

    const allowed = rule.allowedRoles.includes(userRole)
    const readOnly = rule.readOnly ?? (userRole === 'viewer' || userRole === 'analyst')
    return { allowed, readOnly }
  }
}
