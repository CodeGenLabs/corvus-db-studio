/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-node-in-ui',
      comment: 'coding-rules §1.1 — ui/client/contract không được chạm tầng Node',
      severity: 'error',
      from: { path: '^packages/(ui|client|contract)/' },
      to: { path: '(^node:)|(^electron$)|(^better-sqlite3$)|(^pg$)|(^mysql2$)|(^ssh2$)|(^mssql$)|(^oracledb$)|(^mongodb$)|(^ioredis$)' },
    },
    {
      name: 'no-engine-in-ui',
      comment: 'coding-rules §1.1 — ui/client không được import engine/services/driver/storage/tunnel',
      severity: 'error',
      from: { path: '^packages/(ui|client)/' },
      to: { path: '^packages/(engine|services|storage|tunnel|driver-)' },
    },
    {
      name: 'contract-is-leaf',
      comment: 'coding-rules §1.2 — contract là lá, không phụ thuộc package nội bộ nào',
      severity: 'error',
      from: { path: '^packages/contract/' },
      to: { path: '^packages/(?!contract)' },
    },
    {
      name: 'drivers-are-isolated',
      comment: 'coding-rules §1.3 — driver-* không import services/engine',
      severity: 'error',
      from: { path: '^packages/driver-(?!core)' },
      to: { path: '^packages/(services|engine)/' },
    },
    {
      name: 'no-electron-outside-desktop',
      comment: 'coding-rules §1.4 — electron chỉ trong apps/desktop',
      severity: 'error',
      from: { pathNot: '^apps/desktop/' },
      to: { path: '^electron$' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'file không ai import — thường là code chết',
      severity: 'warn',
      from: { orphan: true, pathNot: '[.]d[.]ts$|(^|/)index[.]ts$|[.]config[.](js|ts)$' },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|coverage|[.]scratch|[.]turbo)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
  },
}
