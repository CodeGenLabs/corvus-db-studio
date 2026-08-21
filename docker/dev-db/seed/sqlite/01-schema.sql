-- Schema definition for SQLite (conformance & dev)
-- data-model.md §1 & §2

CREATE TABLE country (
  country_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  country     TEXT NOT NULL,
  iso_code    TEXT,
  last_update TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX country_name_uq ON country (country);

CREATE TABLE city (
  city_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL REFERENCES country(country_id) ON DELETE CASCADE,
  city       TEXT NOT NULL,
  note       TEXT
);

CREATE INDEX city_country_idx ON city (country_id);

CREATE TABLE "order details" (
  id          INTEGER PRIMARY KEY,
  "sản lượng" NUMERIC,
  "select"    TEXT
);

CREATE VIEW city_view AS
  SELECT c.city_id, c.city, n.country
  FROM city c JOIN country n ON n.country_id = c.country_id;

CREATE TABLE types_probe (
  id          INTEGER PRIMARY KEY,
  big_val     INTEGER,
  numeric_val NUMERIC(30,10),
  bool_val    BOOLEAN,
  text_null   TEXT,
  text_empty  TEXT,
  json_val    JSON,
  bytes_val   BLOB,
  ts_val      DATETIME
);
