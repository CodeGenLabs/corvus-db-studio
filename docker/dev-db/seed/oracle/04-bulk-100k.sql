-- Seed ~100,000 deterministic rows into order_log (Oracle)
-- FR-011, FR-012, data-model.md §2

INSERT INTO order_log (order_log_id, customer_id, amount, status, placed_at)
SELECT
  LEVEL AS order_log_id,
  MOD(LEVEL - 1, 6) + 1 AS customer_id,
  ROUND((MOD(LEVEL * 17, 50000) + 1000) / 100, 2) AS amount,
  CASE MOD(LEVEL, 4)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'pending'
    WHEN 2 THEN 'shipped'
    ELSE 'cancelled'
  END AS status,
  TIMESTAMP '2026-01-01 00:00:00 UTC' + NUMTODSINTERVAL(LEVEL, 'MINUTE') AS placed_at
FROM DUAL
CONNECT BY LEVEL <= 100000;

COMMIT;
