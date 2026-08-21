-- Dev environment extensions for SQLite
-- data-model.md §2, FR-009, FR-010, SR-004

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

-- Seed customer data (SR-004: fake data only, @example.invalid)
INSERT OR IGNORE INTO customer (customer_id, country_id, email, full_name, created_at, is_active) VALUES
  (1, 1, 'customer0001@example.invalid', 'Nguyen Van A', '2026-01-01 08:00:00', 1),
  (2, 1, 'customer0002@example.invalid', 'Tran Thi B', '2026-01-02 09:30:00', 1),
  (3, 2, 'customer0003@example.invalid', 'Kenji Sato', '2026-01-03 10:15:00', 1),
  (4, 2, 'customer0004@example.invalid', 'Yuki Tanaka', '2026-01-04 11:00:00', 0),
  (5, 3, 'customer0005@example.invalid', 'Lucas Silva', '2026-01-05 12:45:00', 1),
  (6, 3, 'customer0006@example.invalid', 'Beatriz Souza', '2026-01-06 14:20:00', 1);

-- Seed marker
INSERT OR REPLACE INTO corvus_env_marker (key, value, seeded_at, seed_version)
VALUES ('corvus_dev', 'ready', '2026-01-01 00:00:00', '1.0.0');
