import type { Command } from '../types'

export const SQL_COMMANDS: readonly Command[] = [
  {
    id: 'sql.runSelection',
    labelKey: 'runSqlSelection',
    surfaces: ['ctx-sql-editor'],
    targets: ['editor-selection'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['query.execute'],
    async run() {},
  },
  {
    id: 'sql.formatSelection',
    labelKey: 'formatSqlSelection',
    surfaces: ['ctx-sql-editor'],
    targets: ['editor-selection'],
    cardinality: 'single',
    availability: {
      needsConnection: false,
    },
    write: 'none',
    rpc: [],
    async run() {},
  },
  {
    id: 'sql.runAll',
    labelKey: 'runAllSql',
    surfaces: ['ctx-sql-editor'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['query.execute'],
    async run() {},
  },
  {
    id: 'sql.clearEditor',
    labelKey: 'clearSqlEditor',
    surfaces: ['ctx-sql-editor'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: false,
    },
    write: 'none',
    rpc: [],
    async run() {},
  },
]
