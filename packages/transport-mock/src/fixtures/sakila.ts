import type { Dataset, FieldDef, TableRow, TreeNode } from '@corvus/contract'

export const TABLES: TableRow[] = [
  ['actor', '200', '16 KB', 'InnoDB', '204', '2026-07-14 09:12'],
  ['address', '603', '96 KB', 'InnoDB', '606', '2026-07-14 09:12'],
  ['category', '16', '16 KB', 'InnoDB', '17', '2026-06-02 11:40'],
  ['city', '600', '48 KB', 'InnoDB', '601', '2026-07-14 09:12'],
  ['country', '109', '16 KB', 'InnoDB', '111', '2026-08-11 12:05'],
  ['customer', '599', '80 KB', 'InnoDB', '600', '2026-08-11 12:05'],
  ['film', '1000', '192 KB', 'InnoDB', '1001', '2026-07-30 16:22'],
  ['film_actor', '5462', '192 KB', 'InnoDB', '0', '2026-07-30 16:22'],
  ['film_category', '1000', '64 KB', 'InnoDB', '0', '2026-07-30 16:22'],
  ['inventory', '4581', '176 KB', 'InnoDB', '4582', '2026-08-04 08:01'],
  ['language', '6', '16 KB', 'InnoDB', '7', '2026-05-19 14:33'],
  ['payment', '16044', '1552 KB', 'InnoDB', '16050', '2026-08-10 22:14'],
  ['rental', '16044', '1552 KB', 'InnoDB', '16050', '2026-08-10 22:14'],
  ['staff', '2', '64 KB', 'InnoDB', '3', '2026-05-19 14:33'],
  ['store', '2', '16 KB', 'InnoDB', '4', '2026-05-19 14:33'],
]

const COUNTRY_ROWS: string[][] = [
  ['1', 'Afghanistan', '2026-02-15 04:44:00', '1'],
  ['2', 'Algeria', '2026-02-15 04:44:00', '3'],
  ['3', 'American Samoa', '2026-02-15 04:44:00', '1'],
  ['4', 'Angola', '2026-02-15 04:44:00', '2'],
  ['5', 'Anguilla', '2026-02-15 04:44:00', '1'],
  ['6', 'Argentina', '2026-02-15 04:44:00', '13'],
  ['7', 'Armenia', '2026-02-15 04:44:00', '1'],
  ['8', 'Australia', '2026-02-15 04:44:00', '12'],
  ['9', 'Austria', '2026-02-15 04:44:00', '3'],
  ['10', 'Azerbaijan', '2026-02-15 04:44:00', '2'],
  ['11', 'Bahrain', '2026-02-15 04:44:00', '1'],
  ['12', 'Bangladesh', '2026-02-15 04:44:00', '3'],
  ['13', 'Belarus', '2026-02-15 04:44:00', '2'],
  ['14', 'Bolivia', '2026-02-15 04:44:00', '2'],
  ['15', 'Brazil', '2026-02-15 04:44:00', '28'],
  ['16', 'Vietnam', '2026-08-11 12:05:02', '6'],
]

export const DATASETS: Record<string, Dataset> = {
  country: {
    cols: ['country_id', 'country', 'last_update', 'city_count'],
    align: ['r', 't', 'm', 'r'],
    widths: ['110px', '1fr', '200px', '130px'],
    total: '109',
    rows: COUNTRY_ROWS,
  },
  customer: {
    cols: ['customer_id', 'first_name', 'last_name', 'email', 'active', 'last_update'],
    align: ['r', 't', 't', 'm', 'r', 'm'],
    widths: ['110px', '130px', '130px', '1fr', '70px', '170px'],
    total: '599',
    rows: [
      ['1', 'Mary', 'Smith', 'mary.smith@sakila.dev', '1', '2026-02-15 04:57'],
      ['2', 'Patricia', 'Johnson', 'patricia.j@sakila.dev', '1', '2026-02-15 04:57'],
      ['33', 'Alberto', 'Dixon', 'alberto.dixon@sakila.dev', '0', '2026-08-11 12:05'],
      ['89', 'Julia', 'Flores', 'julia.flores@sakila.dev', '1', '2026-08-11 12:05'],
      ['148', 'Eleanor', 'Hunt', 'eleanor.hunt@corvus.io', '1', '2026-08-11 12:05'],
      ['201', 'Kenneth', 'Gooden', 'kenneth.gooden@sakila.dev', '1', '2026-02-15 04:57'],
      ['347', 'Diane', 'Collins', 'diane.collins@sakila.dev', '1', '2026-02-15 04:57'],
      ['512', 'Roberto', 'Vega', 'roberto.vega@sakila.dev', '1', '2026-02-15 04:57'],
      ['600', 'Thu Nga', 'Pham', 'thunga.pham@corvus.io', '1', '2026-08-11 12:05'],
    ],
  },
  film: {
    cols: ['film_id', 'title', 'release_year', 'language_id', 'rental_rate', 'length', 'rating'],
    align: ['r', 't', 'r', 'r', 'r', 'r', 'm'],
    widths: ['90px', '1fr', '110px', '100px', '100px', '80px', '80px'],
    total: '1000',
    rows: [
      ['1', 'ACADEMY DINOSAUR', '2006', '1', '0.99', '86', 'PG'],
      ['2', 'ACE GOLDFINGER', '2006', '1', '4.99', '48', 'G'],
      ['3', 'ADAPTATION HOLES', '2006', '1', '2.99', '50', 'NC-17'],
      ['4', 'AFFAIR PREJUDICE', '2006', '1', '2.99', '117', 'G'],
      ['5', 'AFRICAN EGG', '2006', '1', '2.99', '130', 'G'],
      ['6', 'AGENT TRUMAN', '2006', '1', '2.99', '169', 'PG'],
      ['7', 'AIRPLANE SIERRA', '2006', '1', '4.99', '62', 'PG-13'],
      ['8', 'AIRPORT POLLOCK', '2006', '1', '4.99', '54', 'R'],
      ['9', 'ALABAMA DEVIL', '2006', '1', '2.99', '114', 'PG-13'],
    ],
  },
  payment: {
    cols: ['payment_id', 'customer_id', 'staff_id', 'rental_id', 'amount', 'payment_date'],
    align: ['r', 'r', 'r', 'r', 'r', 'm'],
    widths: ['110px', '120px', '100px', '110px', '110px', '1fr'],
    total: '16044',
    rows: [
      ['1', '1', '1', '76', '2.99', '2026-05-25 11:30:37'],
      ['2', '1', '1', '573', '0.99', '2026-05-28 10:35:23'],
      ['3', '1', '1', '1185', '5.99', '2026-06-15 00:54:12'],
      ['4', '1', '2', '1422', '0.99', '2026-06-15 18:02:53'],
      ['5', '2', '1', '1476', '9.99', '2026-06-15 21:08:46'],
      ['6', '2', '2', '1725', '4.99', '2026-06-16 15:18:57'],
      ['7', '3', '1', '2308', '4.99', '2026-06-18 08:41:48'],
      ['8', '3', '2', '2363', '0.99', '2026-06-18 13:33:59'],
      ['9', '4', '1', '3284', '3.99', '2026-06-21 06:24:45'],
    ],
  },
}

/** Columns without a hand-written dataset fall back to a naming-convention guess. */
export function inferType(col: string, first: boolean): Omit<FieldDef, 'name'> {
  if (first) return { ddl: 'SMALLINT UNSIGNED', type: 'smallint unsigned', len: '5', notNull: true, key: 'PK', def: '' }
  if (/_id$/.test(col)) return { ddl: 'SMALLINT UNSIGNED', type: 'smallint unsigned', len: '5', notNull: true, key: 'FK', def: '' }
  if (/date$|update$/.test(col)) return { ddl: 'TIMESTAMP', type: 'timestamp', len: '', notNull: true, key: '', def: 'CURRENT_TIMESTAMP' }
  if (/year$/.test(col)) return { ddl: 'YEAR', type: 'year', len: '', notNull: false, key: '', def: 'NULL' }
  if (/amount$|rate$/.test(col)) return { ddl: 'DECIMAL(5,2)', type: 'decimal', len: '5,2', notNull: true, key: '', def: '0.00' }
  if (/^active$/.test(col)) return { ddl: 'TINYINT(1)', type: 'tinyint', len: '1', notNull: true, key: '', def: '1' }
  if (/count$|length$/.test(col)) return { ddl: 'INT UNSIGNED', type: 'int unsigned', len: '10', notNull: false, key: '', def: 'NULL' }
  if (/rating$/.test(col)) return { ddl: "ENUM('G','PG','PG-13','R','NC-17')", type: 'enum(5)', len: '', notNull: false, key: '', def: "'G'" }
  return { ddl: 'VARCHAR(50)', type: 'varchar', len: '50', notNull: false, key: '', def: 'NULL' }
}

export function genericDataset(name: string): Dataset {
  const stamp = '2026-08-11 12:05:02'
  return {
    cols: [name + '_id', 'name', 'note', 'last_update'],
    align: ['r', 't', 't', 'm'],
    widths: ['120px', '1fr', '1fr', '200px'],
    total: '—',
    rows: Array.from({ length: 8 }, (_, i) => [String(i + 1), name + ' row ' + (i + 1), 'sample value ' + (i + 1), stamp]),
  }
}

export function datasetFor(name: string): Dataset {
  return DATASETS[name] ?? genericDataset(name)
}

export function fieldsFor(name: string): FieldDef[] {
  return datasetFor(name).cols.map((c, i) => ({ name: c, ...inferType(c, i === 0) }))
}

export const RESULTS: string[][] = [
  ['India', '60', '60', '6 073.42'],
  ['China', '53', '53', '5 251.66'],
  ['United States', '35', '36', '3 685.31'],
  ['Japan', '31', '31', '3 111.03'],
  ['Mexico', '30', '30', '2 984.10'],
  ['Brazil', '28', '28', '2 761.05'],
  ['Russian Federation', '28', '28', '2 690.88'],
  ['Philippines', '20', '20', '1 976.31'],
  ['Turkey', '15', '15', '1 480.55'],
]

export const DIFF: string[][] = [
  ['~', '148', 'Eleanor', 'eleanor.hunt@sakila.dev → eleanor.hunt@corvus.io', '1', '12:05:02'],
  ['~', '33', 'Alberto', 'alberto.dixon@sakila.dev', '1 → 0', '12:05:02'],
  ['~', '89', 'Julia', 'julia.flores@sakila.dev', '1', '2026-02-15 → 12:05:02'],
  ['+', '600', 'Thu Nga', 'thunga.pham@corvus.io', '1', '12:05:02'],
  ['−', '274', 'Naomi', 'naomi.jennings@sakila.dev', '1', '2026-02-15 04:57'],
]

export const DESIGN: string[][] = [
  ['country_id', 'smallint unsigned', '5', '', '✓', 'PK', 'Surrogate key'],
  ['country', 'varchar', '50', 'NULL', '✓', 'UQ', 'ISO country name'],
  ['iso_code', 'char', '2', 'NULL', '', 'IDX', 'ISO 3166-1 alpha-2'],
  ['region', 'varchar', '40', 'NULL', '', '', 'Sales region'],
  ['last_update', 'timestamp', '', 'CURRENT_TIMESTAMP', '✓', '', 'Auto-maintained'],
]

export const JOBS: string[][] = [
  ['Nightly full dump', 'sakila · Local Dev', '0 2 * * *', '2026-08-12 02:00', 'ok'],
  ['Hourly binlog ship', 'sakila · Local Dev', '0 * * * *', '2026-08-12 09:00', 'ok'],
  ['Analytics ETL', 'public · Analytics', '*/30 * * * *', '2026-08-12 09:30', 'running'],
  ['Reporting snapshot', 'dw · Reporting', '0 6 * * 1', '2026-08-10 06:00', 'warn'],
  ['Legacy ERP export', 'erp · Legacy ERP', '0 23 * * 5', '2026-08-07 23:00', 'fail'],
  ['Redis key audit', 'cache · Cache', '0 4 * * *', '2026-08-12 04:00', 'ok'],
]

export const BK_FILES: string[][] = [
  ['sakila_20260812_0200.sql.gz', '2026-08-12 02:00', '3.1 GB', 'Full', 'ok'],
  ['sakila_20260811_0200.sql.gz', '2026-08-11 02:00', '3.1 GB', 'Full', 'ok'],
  ['sakila_binlog_20260812_0900.tar', '2026-08-12 09:00', '412 MB', 'Incremental', 'ok'],
  ['sakila_schema_20260810.sql', '2026-08-10 18:22', '1.4 MB', 'Structure', 'ok'],
  ['sakila_20260810_0200.sql.gz', '2026-08-10 02:00', '3.0 GB', 'Full', 'warn'],
  ['sakila_20260809_0200.sql.gz', '2026-08-09 02:00', '—', 'Full', 'fail'],
]

export const DB_USERS: string[][] = [
  ['corvus_app', '10.4.%', 'app_readwrite', '2026-08-12 10:41', 'active'],
  ['corvus_ro', '%', 'analytics_read', '2026-08-12 09:02', 'active'],
  ['etl_worker', '10.4.12.%', 'etl_operator', '2026-08-12 02:00', 'active'],
  ['tuan', 'localhost', 'dba (superuser)', '2026-08-12 10:38', 'active'],
  ['legacy_report', '192.168.%', 'analytics_read', '2026-05-02 16:20', 'locked'],
  ['tmp_migration', 'localhost', 'ddl_only', '2026-07-30 16:22', 'expired'],
]

export interface ErTable {
  name: string
  x: number
  y: number
  w: number
  fields: [key: string, name: string, type: string][]
}

export const ER: ErTable[] = [
  { name: 'country', x: 60, y: 90, w: 190, fields: [['PK', 'country_id', 'smallint'], ['UQ', 'country', 'varchar(50)'], ['', 'iso_code', 'char(2)'], ['', 'last_update', 'timestamp']] },
  { name: 'city', x: 352, y: 170, w: 262, fields: [['PK', 'city_id', 'smallint'], ['FK', 'country_id', 'smallint'], ['', 'city', 'varchar(50)'], ['', 'last_update', 'timestamp']] },
  { name: 'address', x: 704, y: 110, w: 250, fields: [['PK', 'address_id', 'smallint'], ['FK', 'city_id', 'smallint'], ['', 'address', 'varchar(50)'], ['', 'postal_code', 'varchar(10)']] },
  { name: 'customer', x: 704, y: 360, w: 250, fields: [['PK', 'customer_id', 'smallint'], ['FK', 'address_id', 'smallint'], ['', 'email', 'varchar(50)'], ['', 'active', 'tinyint(1)']] },
  { name: 'store', x: 60, y: 360, w: 190, fields: [['PK', 'store_id', 'tinyint'], ['FK', 'address_id', 'smallint'], ['FK', 'manager_staff_id', 'tinyint']] },
]

const TABLE_NODES: TreeNode[] = TABLES.map((r) => ({ label: r[0], meta: r[1], depth: 3, kind: 'table' }))

export const TREE: TreeNode[] = [
  {
    label: 'Local Dev', meta: 'MySQL', depth: 0, kind: 'conn',
    children: [
      {
        label: 'sakila', meta: '', depth: 1, kind: 'db',
        children: [
          { label: 'Tables', meta: '15', depth: 2, kind: 'folder', children: TABLE_NODES },
          { label: 'Views', meta: '7', depth: 2, kind: 'folder' },
          { label: 'Functions', meta: '3', depth: 2, kind: 'folder' },
          { label: 'Queries', meta: '12', depth: 2, kind: 'folder' },
          { label: 'Backups', meta: '4', depth: 2, kind: 'folder' },
        ],
      },
      { label: 'world', meta: '', depth: 1, kind: 'db' },
      { label: 'employees', meta: '', depth: 1, kind: 'db' },
    ],
  },
  {
    label: 'Analytics', meta: 'PostgreSQL', depth: 0, kind: 'conn',
    children: [
      { label: 'public', meta: '', depth: 1, kind: 'db' },
      { label: 'staging', meta: '', depth: 1, kind: 'db' },
    ],
  },
  { label: 'Reporting', meta: 'SQL Server', depth: 0, kind: 'conn', children: [{ label: 'dw', meta: '', depth: 1, kind: 'db' }] },
  { label: 'Legacy ERP', meta: 'Oracle', depth: 0, kind: 'conn', children: [{ label: 'ERPPROD', meta: '', depth: 1, kind: 'db' }] },
  { label: 'mobile.sqlite', meta: 'SQLite', depth: 0, kind: 'conn', children: [{ label: 'main', meta: '', depth: 1, kind: 'db' }] },
  { label: 'Events', meta: 'MongoDB', depth: 0, kind: 'conn', children: [{ label: 'events', meta: '', depth: 1, kind: 'db' }] },
  { label: 'Cache', meta: 'Redis', depth: 0, kind: 'conn', children: [{ label: 'db0', meta: '', depth: 1, kind: 'db' }] },
]
