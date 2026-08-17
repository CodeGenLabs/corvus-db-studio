import { z } from 'zod'
import { defineUnary } from '../define'

export const securityUsers = defineUnary({
  name: 'security.users',
  params: z.object({ connectionId: z.string() }),
  result: z.array(
    z.object({
      user: z.string(),
      host: z.string().optional(),
      roles: z.array(z.string()).default([]),
      status: z.string().optional(),
    }),
  ),
  permission: 'security:read',
  audit: 'none',
})

export const securityRoles = defineUnary({
  name: 'security.roles',
  params: z.object({ connectionId: z.string() }),
  result: z.array(
    z.object({
      role: z.string(),
      members: z.array(z.string()).default([]),
    }),
  ),
  permission: 'security:read',
  audit: 'none',
})

export const securityPrivileges = defineUnary({
  name: 'security.privileges',
  params: z.object({ connectionId: z.string(), userOrRole: z.string() }),
  result: z.array(
    z.object({
      object: z.string(),
      privilege: z.string(),
      granted: z.boolean(),
      inheritedFrom: z.string().optional(),
    }),
  ),
  permission: 'security:read',
  audit: 'none',
})

export const securityPreviewGrant = defineUnary({
  name: 'security.previewGrant',
  params: z.object({
    connectionId: z.string(),
    userOrRole: z.string(),
    grants: z.array(z.object({ object: z.string(), privilege: z.string(), grant: z.boolean() })),
  }),
  result: z.object({
    sql: z.string(),
    previewToken: z.string(),
    warnings: z.array(z.string()).default([]),
  }),
  permission: 'security:write',
  audit: 'metadata',
})

export const securityApplyGrant = defineUnary({
  name: 'security.applyGrant',
  params: z.object({
    previewToken: z.string(),
  }),
  result: z.object({ success: z.boolean() }),
  permission: 'security:write',
  audit: 'full',
  guard: 'writeGuard',
})

export const securityMethods = {
  'security.users': securityUsers,
  'security.roles': securityRoles,
  'security.privileges': securityPrivileges,
  'security.previewGrant': securityPreviewGrant,
  'security.applyGrant': securityApplyGrant,
} as const
