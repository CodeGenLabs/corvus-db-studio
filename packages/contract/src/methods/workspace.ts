import { z } from 'zod'
import { defineUnary } from '../define'

export const workspaceSettingsGet = defineUnary({
  name: 'workspace.settings.get',
  params: z.object({}),
  result: z.record(z.string(), z.unknown()),
  permission: 'workspace:read',
  audit: 'none',
})

export const workspaceSettingsSet = defineUnary({
  name: 'workspace.settings.set',
  params: z.object({ settings: z.record(z.string(), z.unknown()) }),
  result: z.object({ success: z.boolean() }),
  permission: 'workspace:write',
  audit: 'metadata',
})

export const workspaceMethods = {
  'workspace.settings.get': workspaceSettingsGet,
  'workspace.settings.set': workspaceSettingsSet,
} as const
