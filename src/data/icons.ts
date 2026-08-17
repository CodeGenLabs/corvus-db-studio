import type { NodeKind, TreeNode } from '../types'

export const ICONS: Record<string, string> = {
  conn: 'M2.5 3.5h11v4h-11z M2.5 8.5h11v4h-11z M4.5 5.5h.01 M4.5 10.5h.01',
  db: 'M2.5 4.3c0-1 2.5-1.8 5.5-1.8s5.5.8 5.5 1.8v7.4c0 1-2.5 1.8-5.5 1.8s-5.5-.8-5.5-1.8z M2.5 8c0 1 2.5 1.8 5.5 1.8s5.5-.8 5.5-1.8',
  table: 'M2.5 3.5h11v9h-11z M2.5 6.5h11 M6.5 6.5v6 M10 6.5v6',
  view: 'M1.5 8S4 4.2 8 4.2 14.5 8 14.5 8S12 11.8 8 11.8 1.5 8 1.5 8z M8 6.4a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2',
  func: 'M7 3.2C5.4 3.2 5 4.1 5 5.3v7.5 M3.3 7.6h3.6 M9.2 6.6l3.5 5.4 M12.7 6.6l-3.5 5.4',
  query: 'M3.3 4.8L6.4 8l-3.1 3.2 M8.4 11.4h4.3',
  backup: 'M2.5 3.8h11v8.4h-11z M2.5 7h11 M8 8.4v3.2 M6.6 10.2L8 11.6l1.4-1.4',
  folder: 'M2.5 12.8V4.2h3.9L7.8 5.9h5.7v6.9z',
}

/** Path + stroke colour per database engine, keyed by the tree node's `meta`. */
export const DB_ICON: Record<string, [path: string, color: string]> = {
  MySQL: ['M2.5 4.3c0-1 2.5-1.8 5.5-1.8s5.5.8 5.5 1.8v7.4c0 1-2.5 1.8-5.5 1.8s-5.5-.8-5.5-1.8z M2.5 6.8c0 1 2.5 1.8 5.5 1.8s5.5-.8 5.5-1.8 M2.5 9.6c0 1 2.5 1.8 5.5 1.8s5.5-.8 5.5-1.8', 'var(--accent)'],
  PostgreSQL: ['M8 2.2l5 2.9v5.8L8 13.8 3 10.9V5.1z M8 5.6v4.8 M5.9 7v2 M10.1 7v2', 'var(--accent)'],
  'SQL Server': ['M2.5 3.5h11v9h-11z M5.8 3.5v9 M5.8 6.6h7.7 M5.8 9.6h7.7', 'var(--coral)'],
  Oracle: ['M8 3.1a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8 M8 5.9a2.1 2.1 0 100 4.2 2.1 2.1 0 000-4.2', 'var(--red)'],
  SQLite: ['M4.2 2.5h4.6l3.2 3.2v8.1H4.2z M8.8 2.5v3.2h3.2 M6.2 9h4 M6.2 11.2h4', 'var(--green)'],
  MongoDB: ['M8 2.2c2.6 2.5 3.7 4.5 3.7 6.4 0 2.4-1.6 4.4-3.7 5.2-2.1-.8-3.7-2.8-3.7-5.2 0-1.9 1.1-3.9 3.7-6.4z M8 5.1v8.7', 'var(--green)'],
  Redis: ['M8 2.4l5.4 2.5L8 7.4 2.6 4.9z M2.6 7.9l5.4 2.5 5.4-2.5 M2.6 10.9l5.4 2.5 5.4-2.5', 'var(--red)'],
}

export function dbMark(meta: string | undefined): [string, string] | null {
  const key = Object.keys(DB_ICON).find((k) => (meta ?? '').indexOf(k) === 0)
  return key ? DB_ICON[key] : null
}

const FOLDER_ICON: Record<string, string> = {
  Tables: 'table',
  Views: 'view',
  Functions: 'func',
  Queries: 'query',
  Backups: 'backup',
}

export const ICON_COLOR: Record<string, string> = {
  conn: 'var(--accent)',
  db: 'var(--amber)',
  table: 'var(--accent)',
  view: 'var(--green)',
  func: 'var(--coral)',
  query: 'var(--amber)',
  backup: 'var(--text3)',
  folder: 'var(--text3)',
}

export function iconKey(n: Pick<TreeNode, 'kind' | 'label'>): string {
  if (n.kind === ('folder' satisfies NodeKind)) return FOLDER_ICON[n.label] ?? 'folder'
  return n.kind
}
