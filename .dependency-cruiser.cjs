/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-node-in-ui',
      comment: 'packages/ui must never import node:* or electron',
      severity: 'error',
      from: { path: '^packages/ui' },
      to: { path: '(^node:)|(^electron$)|(^better-sqlite3$)|(^pg$)|(^mysql2$)' },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.base.json',
    },
  },
}
