import { z } from 'zod'
import { defineUnary } from '../define'
import { OBJECT_KINDS } from '../capabilities'

const ColumnMetaSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  nullable: z.boolean(),
  defaultValue: z.string().nullable().optional(),
  isPrimaryKey: z.boolean(),
  isAutoIncrement: z.boolean().optional(),
  comment: z.string().optional(),
  ordinalPosition: z.number().int(),
})

const IndexMetaSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  unique: z.boolean(),
  primary: z.boolean(),
  type: z.string().optional(),
})

const ForeignKeyMetaSchema = z.object({
  name: z.string(),
  column: z.string(),
  referencedTable: z.string(),
  referencedColumn: z.string(),
  onUpdate: z.string().optional(),
  onDelete: z.string().optional(),
})

const TableMetaSchema = z.object({
  name: z.string(),
  schema: z.string().optional(),
  columns: z.array(ColumnMetaSchema),
  indexes: z.array(IndexMetaSchema),
  foreignKeys: z.array(ForeignKeyMetaSchema),
  rowCount: z.number().optional(),
  sizeBytes: z.number().optional(),
  engine: z.string().optional(),
  comment: z.string().optional(),
})

export const introspectDatabases = defineUnary({
  name: 'introspect.databases',
  params: z.object({ connectionId: z.string() }),
  result: z.array(z.string()),
  permission: 'introspect:read',
  audit: 'none',
})

export const introspectSchemas = defineUnary({
  name: 'introspect.schemas',
  params: z.object({ connectionId: z.string(), database: z.string().optional() }),
  result: z.array(z.string()),
  permission: 'introspect:read',
  audit: 'none',
})

export const introspectObjects = defineUnary({
  name: 'introspect.objects',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    kind: z.enum(OBJECT_KINDS).optional(),
  }),
  result: z.array(
    z.object({
      name: z.string(),
      kind: z.string(),
      rows: z.string().optional(),
      size: z.string().optional(),
      engine: z.string().optional(),
      modified: z.string().optional(),
    }),
  ),
  permission: 'introspect:read',
  audit: 'none',
})

export const introspectTableMeta = defineUnary({
  name: 'introspect.tableMeta',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    table: z.string(),
  }),
  result: TableMetaSchema,
  permission: 'introspect:read',
  audit: 'none',
})

export const introspectRoutineMeta = defineUnary({
  name: 'introspect.routineMeta',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    name: z.string(),
  }),
  result: z.object({
    name: z.string(),
    params: z.array(z.object({ name: z.string(), type: z.string(), mode: z.string() })),
    returnType: z.string().optional(),
    body: z.string(),
  }),
  permission: 'introspect:read',
  audit: 'none',
})

export const introspectDdl = defineUnary({
  name: 'introspect.ddl',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    name: z.string(),
    kind: z.string(),
  }),
  result: z.object({ ddl: z.string() }),
  permission: 'introspect:read',
  audit: 'none',
})

export const introspectDependencies = defineUnary({
  name: 'introspect.dependencies',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    name: z.string(),
  }),
  result: z.object({
    using: z.array(z.string()),
    usedBy: z.array(z.string()),
  }),
  permission: 'introspect:read',
  audit: 'none',
})

export const introspectIdentifiers = defineUnary({
  name: 'introspect.identifiers',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
  }),
  result: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(['table', 'column', 'function', 'schema', 'database', 'keyword']),
      parent: z.string().optional(),
      type: z.string().optional(),
    }),
  ),
  permission: 'introspect:read',
  audit: 'none',
})

export const introspectMethods = {
  'introspect.databases': introspectDatabases,
  'introspect.schemas': introspectSchemas,
  'introspect.objects': introspectObjects,
  'introspect.tableMeta': introspectTableMeta,
  'introspect.routineMeta': introspectRoutineMeta,
  'introspect.ddl': introspectDdl,
  'introspect.dependencies': introspectDependencies,
  'introspect.identifiers': introspectIdentifiers,
} as const
