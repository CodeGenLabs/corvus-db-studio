-- SQLite Sample Database DDL & Data
-- data-model.md §2 & FR-002

CREATE TABLE IF NOT EXISTS country (
  country_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  country      TEXT NOT NULL UNIQUE,
  iso_code     TEXT,
  last_update  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS city (
  city_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL REFERENCES country(country_id) ON DELETE CASCADE,
  city       TEXT NOT NULL,
  note       TEXT
);
CREATE INDEX IF NOT EXISTS city_country_idx ON city (country_id);

CREATE TABLE IF NOT EXISTS "order details" (
  id          INTEGER PRIMARY KEY,
  "sản lượng" NUMERIC,
  "select"    TEXT
);

CREATE TABLE IF NOT EXISTS types_probe (
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

CREATE VIEW IF NOT EXISTS city_view AS
  SELECT c.city_id, c.city, n.country
  FROM city c JOIN country n ON n.country_id = c.country_id;

CREATE TABLE IF NOT EXISTS customer (
  customer_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id   INTEGER REFERENCES country(country_id) ON DELETE SET NULL,
  email        TEXT NOT NULL UNIQUE,
  full_name    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT '2026-01-01 00:00:00',
  is_active    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS customer_country_idx ON customer (country_id);

CREATE TABLE IF NOT EXISTS order_log (
  order_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER REFERENCES customer(customer_id) ON DELETE CASCADE,
  amount       NUMERIC NOT NULL,
  status       TEXT NOT NULL,
  placed_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_log_customer_idx ON order_log (customer_id);
CREATE INDEX IF NOT EXISTS order_log_placed_at_idx ON order_log (placed_at);
CREATE INDEX IF NOT EXISTS order_log_status_idx ON order_log (status);

CREATE VIEW IF NOT EXISTS customer_summary AS
  SELECT
    c.customer_id,
    c.full_name,
    c.email,
    co.country,
    COUNT(o.order_log_id) AS total_orders,
    COALESCE(SUM(o.amount), 0) AS total_spent
  FROM customer c
  LEFT JOIN country co ON co.country_id = c.country_id
  LEFT JOIN order_log o ON o.customer_id = c.customer_id
  GROUP BY c.customer_id, c.full_name, c.email, co.country;

CREATE TRIGGER IF NOT EXISTS trg_order_log_touch
AFTER INSERT ON order_log
BEGIN
  UPDATE order_log SET placed_at = '2026-01-01 00:00:00' WHERE order_log_id = NEW.order_log_id AND placed_at IS NULL;
END;

CREATE TABLE IF NOT EXISTS corvus_env_marker (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL,
  seeded_at    TEXT NOT NULL DEFAULT '2026-01-01 00:00:00',
  seed_version TEXT NOT NULL
);

-- Dữ liệu mẫu
INSERT OR IGNORE INTO country (country_id, country, iso_code, last_update) VALUES
  (1, 'Việt Nam', 'VN', '2026-01-01 00:00:00'),
  (2, 'Japan', 'JP', '2026-01-01 00:00:00'),
  (3, 'Brazil', 'BR', '2026-01-01 00:00:00'),
  (4, 'United States', 'US', '2026-01-01 00:00:00'),
  (5, 'Germany', 'DE', '2026-01-01 00:00:00');

INSERT OR IGNORE INTO city (city_id, country_id, city, note) VALUES
  (1, 1, 'Hà Nội', NULL),
  (2, 1, 'Đà Nẵng', ''),
  (3, 2, 'Tokyo', 'thủ đô'),
  (4, 3, 'São Paulo', 'kinh tế'),
  (5, 4, 'New York', 'tài chính');

INSERT OR IGNORE INTO "order details" (id, "sản lượng", "select") VALUES
  (1, 1250.5000, 'standard selection');

INSERT OR IGNORE INTO types_probe
  (id, big_val, numeric_val, bool_val, text_null, text_empty, json_val, bytes_val, ts_val) VALUES
  (1, 9223372036854775807, '12345678901234567890.0123456789', 1,
   NULL, '', '{"a":[1,2,3]}', X'deadbeef', '2026-08-18 09:00:00');

INSERT OR IGNORE INTO customer (customer_id, country_id, email, full_name, created_at, is_active) VALUES
  (1, 1, 'customer0001@example.invalid', 'Nguyen Van A', '2026-01-01 08:00:00', 1),
  (2, 1, 'customer0002@example.invalid', 'Tran Thi B', '2026-01-02 09:30:00', 1),
  (3, 2, 'customer0003@example.invalid', 'Kenji Sato', '2026-01-03 10:15:00', 1),
  (4, 2, 'customer0004@example.invalid', 'Yuki Tanaka', '2026-01-04 11:00:00', 0),
  (5, 3, 'customer0005@example.invalid', 'Lucas Silva', '2026-01-05 12:45:00', 1),
  (6, 3, 'customer0006@example.invalid', 'Beatriz Souza', '2026-01-06 14:20:00', 1),
  (7, 4, 'customer0007@example.invalid', 'John Doe', '2026-01-07 15:10:00', 1),
  (8, 4, 'customer0008@example.invalid', 'Jane Smith', '2026-01-08 16:00:00', 1),
  (9, 5, 'customer0009@example.invalid', 'Hans Mueller', '2026-01-09 17:30:00', 0),
  (10, 5, 'customer0010@example.invalid', 'Emma Weber', '2026-01-10 18:00:00', 1);

INSERT OR REPLACE INTO corvus_env_marker (key, value, seeded_at, seed_version)
VALUES ('corvus_dev', 'ready', '2026-01-01 00:00:00', '1.0.0');
