import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  noExternal: [/^@corvus\//],
  external: [
    'electron',
    'better-sqlite3',
    'pg',
    'pg-cursor',
    'pg-types',
    'pg-native',
    'mysql2',
    'mysql2/promise',
    'mssql',
    'tedious',
    'tarn',
    'oracledb',
    'mongodb',
    'ioredis',
    'ws',
  ],
})
