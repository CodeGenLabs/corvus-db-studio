-- Seed ~100,000 deterministic rows into order_log (MySQL / MariaDB)
-- FR-011, FR-012, data-model.md §2

SET NAMES utf8mb4;
USE corvus_dev;

INSERT INTO order_log (order_log_id, customer_id, amount, status, placed_at)
WITH
  d0 AS (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  ),
  seq AS (
    SELECT (1 + d1.n + d2.n*10 + d3.n*100 + d4.n*1000 + d5.n*10000) AS s
    FROM d0 d1, d0 d2, d0 d3, d0 d4, d0 d5
  )
SELECT
  s AS order_log_id,
  ((s - 1) % 6) + 1 AS customer_id,
  ROUND((((s * 17) % 50000) + 1000) / 100.0, 2) AS amount,
  CASE (s % 4)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'pending'
    WHEN 2 THEN 'shipped'
    ELSE 'cancelled'
  END AS status,
  DATE_ADD('2026-01-01 00:00:00', INTERVAL s MINUTE) AS placed_at
FROM seq
WHERE s <= 100000
ON DUPLICATE KEY UPDATE order_log_id = VALUES(order_log_id);
