import { z } from 'zod'
import { defineUnary } from '../define'

const DriverIdSchema = z.enum([
  'postgres',
  'mysql',
  'mariadb',
  'sqlite',
  'mssql',
  'oracle',
  'mongodb',
  'redis',
])

const SslConfigSchema = z.object({
  mode: z.enum(['disable', 'require', 'verify-ca', 'verify-full']),
  caCert: z.string().optional(),
  clientCert: z.string().optional(),
  clientKey: z.string().optional(),
})

const SshConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string(),
  port: z.number().int().positive(),
  username: z.string(),
  authType: z.enum(['password', 'key', 'agent']),
  privateKey: z.string().optional(),
  passphrase: z.string().optional(),
})

export const ConnectionProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  driverId: DriverIdSchema,
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  database: z.string().optional(),
  user: z.string().optional(),
  ssl: SslConfigSchema.optional(),
  ssh: SshConfigSchema.optional(),
  readOnly: z.boolean().optional(),
  color: z.string().optional(),
  group: z.string().optional(),
})

export const connectionList = defineUnary({
  name: 'connection.list',
  params: z.object({}),
  result: z.array(ConnectionProfileSchema),
  permission: 'connection:list',
  audit: 'none',
})

export const connectionGet = defineUnary({
  name: 'connection.get',
  params: z.object({ id: z.string() }),
  result: ConnectionProfileSchema.nullable(),
  permission: 'connection:get',
  audit: 'none',
})

export const connectionCreate = defineUnary({
  name: 'connection.create',
  params: ConnectionProfileSchema.omit({ id: true }).extend({ password: z.string().optional() }),
  result: ConnectionProfileSchema,
  permission: 'connection:create',
  audit: 'metadata',
})

export const connectionUpdate = defineUnary({
  name: 'connection.update',
  params: ConnectionProfileSchema.extend({ password: z.string().optional() }),
  result: ConnectionProfileSchema,
  permission: 'connection:update',
  audit: 'metadata',
})

export const connectionDelete = defineUnary({
  name: 'connection.delete',
  params: z.object({ id: z.string() }),
  result: z.object({ success: z.boolean() }),
  permission: 'connection:delete',
  audit: 'metadata',
})

export const connectionDuplicate = defineUnary({
  name: 'connection.duplicate',
  params: z.object({ id: z.string(), newName: z.string() }),
  result: ConnectionProfileSchema,
  permission: 'connection:create',
  audit: 'metadata',
})

export const connectionTest = defineUnary({
  name: 'connection.test',
  params: ConnectionProfileSchema.partial().extend({ password: z.string().optional() }),
  result: z.object({
    ok: z.boolean(),
    version: z.string().optional(),
    latencyMs: z.number().optional(),
    error: z.string().optional(),
  }),
  permission: 'connection:test',
  audit: 'none',
})

export const connectionOpen = defineUnary({
  name: 'connection.open',
  params: z.object({ id: z.string() }),
  result: z.object({ sessionId: z.string(), capabilities: z.record(z.string(), z.unknown()) }),
  permission: 'connection:open',
  audit: 'metadata',
})

export const connectionClose = defineUnary({
  name: 'connection.close',
  params: z.object({ id: z.string() }),
  result: z.object({ success: z.boolean() }),
  permission: 'connection:close',
  audit: 'metadata',
})

export const connectionStatus = defineUnary({
  name: 'connection.status',
  params: z.object({ id: z.string() }),
  result: z.object({
    status: z.enum(['connected', 'disconnected', 'reconnecting']),
    activeQueries: z.number().int().nonnegative(),
    poolSize: z.number().int().nonnegative(),
  }),
  permission: 'connection:status',
  audit: 'none',
})

export const connectionParseUri = defineUnary({
  name: 'connection.parseUri',
  params: z.object({ uri: z.string() }),
  result: ConnectionProfileSchema.partial(),
  permission: 'connection:parseUri',
  audit: 'none',
})

export const connectionToUri = defineUnary({
  name: 'connection.toUri',
  params: ConnectionProfileSchema,
  result: z.object({ uri: z.string() }),
  permission: 'connection:toUri',
  audit: 'none',
})

export const connectionMethods = {
  'connection.list': connectionList,
  'connection.get': connectionGet,
  'connection.create': connectionCreate,
  'connection.update': connectionUpdate,
  'connection.delete': connectionDelete,
  'connection.duplicate': connectionDuplicate,
  'connection.test': connectionTest,
  'connection.open': connectionOpen,
  'connection.close': connectionClose,
  'connection.status': connectionStatus,
  'connection.parseUri': connectionParseUri,
  'connection.toUri': connectionToUri,
} as const
