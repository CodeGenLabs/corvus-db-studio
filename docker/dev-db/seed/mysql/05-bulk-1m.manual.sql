-- Seed ~1,000,000 deterministic rows into order_log_bulk on-demand (MySQL / MariaDB)
-- FR-011a, FR-011b, data-model.md §2

USE corvus_dev;

CREATE TABLE IF NOT EXISTS order_log_bulk (
  order_log_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT,
  amount       DECIMAL(12,2) NOT NULL,
  status       VARCHAR(20) NOT NULL,
  placed_at    DATETIME NOT NULL,
  INDEX order_log_bulk_customer_idx (customer_id),
  INDEX order_log_bulk_placed_at_idx (placed_at),
  CONSTRAINT fk_order_log_bulk_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO order_log_bulk (order_log_id, customer_id, amount, status, placed_at)
WITH
  d0 AS (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  ),
  seq AS (
    SELECT (1 + d1.n + d2.n*10 + d3.n*100 + d4.n*1000 + d5.n*10000 + d6.n*100000) AS s
    FROM d0 d1, d0 d2, d0 d3, d0 d4, d0 d5, d0 d6
  )
SELECT
  s AS order_log_id,
  ((s - 1) % 10) + 1 AS customer_id,
  ROUND((((s * 23) % 100000) + 500) / 100.0, 2) AS amount,
  CASE (s % 4)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'pending'
    WHEN 2 THEN 'shipped'
    ELSE 'cancelled'
  END AS status,
  DATE_ADD('2026-01-01 00:00:00', INTERVAL (s * 10) SECOND) AS placed_at
FROM seq
WHERE s <= 1000000
ON DUPLICATE KEY UPDATE order_log_id = VALUES(order_log_id);
