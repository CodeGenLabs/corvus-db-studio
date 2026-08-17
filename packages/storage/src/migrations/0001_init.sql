-- 0001_init.sql · Initial workspace schema

CREATE TABLE IF NOT EXISTS app_user (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  email         TEXT,
  password_hash TEXT,
  oidc_subject  TEXT UNIQUE,
  role          TEXT NOT NULL DEFAULT 'editor',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS vgroup (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  parent_id   TEXT REFERENCES vgroup(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT,
  icon        TEXT,
  target_kind TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS connection (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL REFERENCES app_user(id),
  name         TEXT NOT NULL,
  driver_id    TEXT NOT NULL,
  color        TEXT,
  mode         TEXT NOT NULL DEFAULT 'read-write' CHECK (mode IN ('read-write','read-only')),
  group_id     TEXT REFERENCES vgroup(id),
  config_json  TEXT NOT NULL,
  tunnel_json  TEXT,
  tls_json     TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_connection_owner ON connection(owner_id);

CREATE TABLE IF NOT EXISTS connection_acl (
  connection_id TEXT NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
  principal_id  TEXT NOT NULL,
  access_level  TEXT NOT NULL CHECK (access_level IN ('read','write','admin')),
  PRIMARY KEY (connection_id, principal_id)
);

CREATE TABLE IF NOT EXISTS secret (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  connection_id TEXT,
  kind          TEXT NOT NULL,
  ciphertext    BLOB NOT NULL,
  iv            BLOB NOT NULL,
  tag           BLOB NOT NULL,
  key_version   INTEGER NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_query (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  connection_id TEXT REFERENCES connection(id) ON DELETE SET NULL,
  database_name TEXT,
  schema_name   TEXT,
  name          TEXT NOT NULL,
  sql           TEXT NOT NULL,
  params_json   TEXT,
  group_id      TEXT REFERENCES vgroup(id),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS query_history (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  connection_id TEXT,
  sql           TEXT NOT NULL,
  executed_at   TEXT NOT NULL,
  duration_ms   INTEGER,
  row_count     INTEGER,
  outcome       TEXT NOT NULL,
  error_code    TEXT
);

CREATE INDEX IF NOT EXISTS ix_history_owner_time ON query_history(owner_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS snippet (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL,
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  driver_id  TEXT,
  shortcut   TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS setting (
  owner_id   TEXT NOT NULL,
  key        TEXT NOT NULL,
  value_json TEXT NOT NULL,
  PRIMARY KEY (owner_id, key)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id             TEXT PRIMARY KEY,
  ts             TEXT NOT NULL,
  actor_id       TEXT NOT NULL,
  actor_name     TEXT NOT NULL,
  action         TEXT NOT NULL,
  connection_id  TEXT,
  target         TEXT,
  outcome        TEXT NOT NULL,
  duration_ms    INTEGER NOT NULL,
  level          TEXT NOT NULL,
  sql            TEXT,
  rows_affected  INTEGER,
  client_ip      TEXT,
  user_agent     TEXT,
  error_message  TEXT
);
