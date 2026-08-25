import type { Command } from '../types'

export const TOOL_COMMANDS: readonly Command[] = [
  {
    id: 'tools.findInDatabase',
    labelKey: 'findInDatabase',
    surfaces: ['ctx-nav'],
    targets: ['connection', 'database', 'empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['introspect.objects', 'introspect.tableMeta', 'query.execute'],
    async run(ctx) {
      ctx.openDialog('findInDatabase')
    },
  },
  {
    id: 'tools.dataTransfer',
    labelKey: 'dataTransfer',
    surfaces: ['ctx-nav'],
    targets: ['database', 'empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['job.start', 'job.cancel', 'job.log'],
    async run() {},
  },
  {
    id: 'tools.dataSync',
    labelKey: 'dataSync',
    surfaces: ['ctx-nav'],
    targets: ['database', 'empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
      permission: 'write',
    },
    write: 'none',
    rpc: ['job.start', 'job.cancel', 'job.log'],
    async run() {},
  },
  {
    id: 'tools.structureSync',
    labelKey: 'structureSync',
    surfaces: ['ctx-nav'],
    targets: ['database', 'empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
      permission: 'write',
    },
    write: 'none',
    rpc: ['job.start', 'job.cancel', 'job.log'],
    async run() {},
  },
  {
    id: 'tools.dumpExecuteSql',
    labelKey: 'dumpExecuteSql',
    surfaces: ['ctx-nav'],
    targets: ['database', 'empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['job.start', 'job.cancel', 'job.log', 'file.pickOpen', 'file.pickSave'],
    async run() {},
  },
]
