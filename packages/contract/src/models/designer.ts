import { z } from 'zod'

export const FieldDesignSchema = z.object({
  id: z.string(), // Stable UUID/ID to track renames
  name: z.string().min(1).max(128),
  type: z.string(),
  length: z.string().optional(),
  nullable: z.boolean().default(true),
  isPrimaryKey: z.boolean().default(false),
  autoIncrement: z.boolean().optional(),
  defaultValue: z.string().optional(),
  comment: z.string().optional(),
})

export type FieldDesign = z.infer<typeof FieldDesignSchema>

export const IndexDesignSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(z.string()),
  unique: z.boolean().default(false),
  type: z.string().optional(),
})

export type IndexDesign = z.infer<typeof IndexDesignSchema>

export const ForeignKeyDesignSchema = z.object({
  id: z.string(),
  name: z.string(),
  column: z.string(),
  referencedTable: z.string(),
  referencedColumn: z.string(),
  onUpdate: z.enum(['NO ACTION', 'CASCADE', 'SET NULL', 'RESTRICT']).optional(),
  onDelete: z.enum(['NO ACTION', 'CASCADE', 'SET NULL', 'RESTRICT']).optional(),
})

export type ForeignKeyDesign = z.infer<typeof ForeignKeyDesignSchema>

export const TableDesignSchema = z.object({
  name: z.string().min(1).max(128),
  schema: z.string().optional(),
  fields: z.array(FieldDesignSchema),
  indexes: z.array(IndexDesignSchema).optional().default([]),
  foreignKeys: z.array(ForeignKeyDesignSchema).optional().default([]),
  comment: z.string().optional(),
  engine: z.string().optional(),
})

export type TableDesign = z.infer<typeof TableDesignSchema>

export const DdlWarningSchema = z.object({
  level: z.enum(['info', 'warning', 'danger']),
  code: z.string(),
  message: z.string(),
})

export type DdlWarning = z.infer<typeof DdlWarningSchema>
