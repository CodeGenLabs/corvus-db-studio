import type { Command } from '../types'

export const OBJECT_COMMANDS: readonly Command[] = [
  {
    id: 'object.open',
    labelKey: 'openTable',
    surfaces: ['toolbar', 'menubar', 'ctx-nav', 'ctx-object-list', 'command-palette'],
    targets: ['object'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['introspect.objects'],
    async run(ctx) {
      if (!ctx.active.connectionId || !ctx.active.selection.primaryTarget) return
      ctx.openTab({
        type: 'object',
        contentKind: 'data',
        connectionId: ctx.active.connectionId,
        database: ctx.active.database ?? undefined,
        namespace: ctx.active.namespace ?? undefined,
        objectKind: ctx.active.selection.objectKind ?? 'table',
        name: ctx.active.selection.primaryTarget,
      })
    },
  },
  {
    id: 'object.design',
    labelKey: 'designTable',
    surfaces: ['toolbar', 'menubar', 'ctx-nav', 'ctx-object-list', 'command-palette'],
    targets: ['object'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
      capability: (caps) => caps.objects.table,
    },
    write: 'none',
    rpc: ['introspect.tableMeta'],
    async run(ctx) {
      if (!ctx.active.connectionId || !ctx.active.selection.primaryTarget) return
      ctx.openTab({
        type: 'object',
        contentKind: 'design',
        connectionId: ctx.active.connectionId,
        database: ctx.active.database ?? undefined,
        namespace: ctx.active.namespace ?? undefined,
        objectKind: ctx.active.selection.objectKind ?? 'table',
        name: ctx.active.selection.primaryTarget,
      })
    },
  },
  {
    id: 'object.newTable',
    labelKey: 'newTable',
    surfaces: ['toolbar', 'menubar', 'ctx-nav', 'ctx-object-list', 'command-palette'],
    targets: ['empty', 'object-group'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
      capability: (caps) => caps.objects.table,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      if (!ctx.active.connectionId) return
      ctx.openTab({
        type: 'object',
        contentKind: 'design',
        connectionId: ctx.active.connectionId,
        database: ctx.active.database ?? undefined,
        namespace: ctx.active.namespace ?? undefined,
        objectKind: 'table',
        name: 'new_table',
      })
    },
  },
  {
    id: 'object.drop',
    labelKey: 'deleteTable',
    surfaces: ['toolbar', 'menubar', 'ctx-nav', 'ctx-object-list'],
    targets: ['object'],
    cardinality: 'multi',
    availability: {
      needsConnection: true,
      permission: 'write',
    },
    write: 'preview-required',
    rpc: ['ddl.previewTable', 'ddl.applyTable'],
    async run() {},
  },
  {
    id: 'connection.disconnect',
    labelKey: 'disconnectConn',
    surfaces: ['ctx-nav'],
    targets: ['connection'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['connection.close'],
    async run(ctx) {
      if (ctx.active.connectionId) {
        await ctx.client.request('connection.close', { connectionId: ctx.active.connectionId })
      }
    },
  },
  {
    id: 'connection.edit',
    labelKey: 'editConn',
    surfaces: ['ctx-nav'],
    targets: ['connection'],
    cardinality: 'single',
    availability: {
      needsConnection: false,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      ctx.openDialog('connection')
    },
  },
  {
    id: 'connection.refresh',
    labelKey: 'refreshNav',
    surfaces: ['ctx-nav'],
    targets: ['connection'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['introspect.schemas'],
    async run(ctx) {
      if (ctx.active.connectionId) {
        await ctx.client.request('introspect.schemas', { connectionId: ctx.active.connectionId })
      }
    },
  },
  {
    id: 'database.open',
    labelKey: 'openDatabase',
    surfaces: ['ctx-nav'],
    targets: ['database'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['introspect.schemas'],
    async run(ctx) {
      if (ctx.active.connectionId) {
        await ctx.client.request('introspect.schemas', { connectionId: ctx.active.connectionId })
      }
    },
  },
  {
    id: 'namespace.open',
    labelKey: 'openNamespace',
    surfaces: ['ctx-nav'],
    targets: ['namespace'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['introspect.objects'],
    async run(ctx) {
      if (ctx.active.connectionId) {
        ctx.openTab({
          type: 'object',
          contentKind: 'data',
          connectionId: ctx.active.connectionId,
          database: ctx.active.database ?? undefined,
          namespace: ctx.active.namespace ?? undefined,
          objectKind: 'table',
          name: '',
        })
      }
    },
  },
  {
    id: 'group.newObject',
    labelKey: 'newObjectInGroup',
    surfaces: ['ctx-nav'],
    targets: ['object-group'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      if (ctx.active.connectionId) {
        ctx.openTab({
          type: 'object',
          contentKind: 'design',
          connectionId: ctx.active.connectionId,
          database: ctx.active.database ?? undefined,
          namespace: ctx.active.namespace ?? undefined,
          objectKind: ctx.active.selection.objectKind ?? 'table',
          name: 'new_item',
        })
      }
    },
  },
  {
    id: 'subelement.inspect',
    labelKey: 'inspectSubElement',
    surfaces: ['ctx-nav'],
    targets: ['sub-element'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['introspect.tableMeta'],
    async run() {},
  },
  {
    id: 'object.refreshList',
    labelKey: 'refreshList',
    surfaces: ['ctx-object-list'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: ['introspect.objects'],
    async run(ctx) {
      if (ctx.active.connectionId) {
        await ctx.client.request('introspect.objects', { connectionId: ctx.active.connectionId })
      }
    },
  },
  {
    id: 'view.table',
    labelKey: 'tbTable',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      if (ctx.active.connectionId) {
        ctx.openTab({
          type: 'object',
          contentKind: 'data',
          connectionId: ctx.active.connectionId,
          database: ctx.active.database ?? undefined,
          namespace: ctx.active.namespace ?? undefined,
          objectKind: 'table',
          name: '',
        })
      }
    },
  },
  {
    id: 'view.view',
    labelKey: 'tbView',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
      capability: (caps) => caps.objects.view,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      if (ctx.active.connectionId) {
        ctx.openTab({
          type: 'object',
          contentKind: 'data',
          connectionId: ctx.active.connectionId,
          database: ctx.active.database ?? undefined,
          namespace: ctx.active.namespace ?? undefined,
          objectKind: 'view',
          name: '',
        })
      }
    },
  },
  {
    id: 'view.function',
    labelKey: 'tbFunction',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
      capability: (caps) => caps.objects.function || caps.objects.procedure,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      if (ctx.active.connectionId) {
        ctx.openTab({
          type: 'object',
          contentKind: 'data',
          connectionId: ctx.active.connectionId,
          database: ctx.active.database ?? undefined,
          namespace: ctx.active.namespace ?? undefined,
          objectKind: 'function',
          name: '',
        })
      }
    },
  },
  {
    id: 'view.sql',
    labelKey: 'tbQuery',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: false,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      ctx.openTab({ type: 'tool', toolKind: 'sql', seq: 1 })
    },
  },
  {
    id: 'view.model',
    labelKey: 'tbModel',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
      capability: (caps) => caps.objects.table,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      if (ctx.active.connectionId) {
        ctx.openTab({
          type: 'object',
          contentKind: 'er',
          connectionId: ctx.active.connectionId,
          database: ctx.active.database ?? undefined,
          namespace: ctx.active.namespace ?? undefined,
          objectKind: 'table',
          name: '',
        })
      }
    },
  },
  {
    id: 'view.backup',
    labelKey: 'tbBackup',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      ctx.openTab({ type: 'tool', toolKind: 'backup', seq: 1 })
    },
  },
  {
    id: 'view.automation',
    labelKey: 'tbAutomation',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: false,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      ctx.openTab({ type: 'tool', toolKind: 'jobs', seq: 1 })
    },
  },
  {
    id: 'view.compare',
    labelKey: 'tbCompare',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: false,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      ctx.openTab({ type: 'tool', toolKind: 'compare', seq: 1 })
    },
  },
  {
    id: 'tool.users',
    labelKey: 'tbUser',
    surfaces: ['toolbar', 'menubar', 'command-palette'],
    targets: ['empty'],
    cardinality: 'single',
    availability: {
      needsConnection: true,
    },
    write: 'none',
    rpc: [],
    async run(ctx) {
      ctx.openDialog('users')
    },
  },
]
