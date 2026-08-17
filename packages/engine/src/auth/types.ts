export type Role = 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer'

export type Permission = string

export interface Actor {
  id: string
  name: string
  role: Role
  permissions: Permission[]
}

export interface AuthContext {
  actor: Actor
  sessionId?: string
  clientIp?: string
  userAgent?: string
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['*'],
  admin: ['connection:*', 'query:*', 'data:*', 'ddl:*', 'job:*', 'security:*', 'user:manage', 'workspace:*'],
  editor: ['connection:read', 'query:execute', 'data:*', 'ddl:*', 'job:run', 'workspace:read'],
  analyst: ['connection:read', 'query:execute', 'data:read', 'job:run:export', 'workspace:read'],
  viewer: ['connection:read', 'query:execute:readonly', 'data:read', 'workspace:read'],
}

export function createSingleUserAuth(actorName = 'local-user'): AuthContext {
  return {
    actor: {
      id: 'local-owner',
      name: actorName,
      role: 'owner',
      permissions: ['*'],
    },
  }
}
