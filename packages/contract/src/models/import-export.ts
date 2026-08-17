import { z } from 'zod'

export const ImportFormatSchema = z.enum(['csv', 'tsv', 'txt', 'json', 'xml', 'xlsx'])
export type ImportFormat = z.infer<typeof ImportFormatSchema>

export const ExportFormatSchema = z.enum([
  'csv',
  'tsv',
  'txt',
  'json',
  'xml',
  'sql',
  'html',
  'markdown',
  'xlsx',
])
export type ExportFormat = z.infer<typeof ExportFormatSchema>

export const ImportModeSchema = z.enum(['append', 'update', 'append_update', 'delete', 'copy'])
export type ImportMode = z.infer<typeof ImportModeSchema>

export const FieldMappingSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  targetType: z.string(),
  isKey: z.boolean().optional(),
  ignored: z.boolean().optional(),
})

export type FieldMapping = z.infer<typeof FieldMappingSchema>

export const ImportOptionsSchema = z.object({
  delimiter: z.string().default(','),
  qualifier: z.string().default('"'),
  headerRow: z.number().int().default(1),
  dataStartRow: z.number().int().default(2),
  encoding: z.string().default('utf-8'),
  emptyAsNull: z.boolean().default(true),
  continueOnError: z.boolean().default(false),
  batchSize: z.number().int().default(1000),
})

export type ImportOptions = z.infer<typeof ImportOptionsSchema>
