-- Seed ~100,000 deterministic rows into order_log (PostgreSQL)
-- FR-011, FR-012, data-model.md §2

INSERT INTO corvus_dev.order_log (order_log_id, customer_id, amount, status, placed_at)
SELECT
  s AS order_log_id,
  ((s - 1) % 6) + 1 AS customer_id,
  (((s * 17) % 50000) + 1000)::numeric / 100 AS amount,
  CASE (s % 4)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'pending'
    WHEN 2 THEN 'shipped'
    ELSE 'cancelled'
  END AS status,
  '2026-01-01 00:00:00+00'::timestamptz + (s * interval '1 minute') AS placed_at
FROM generate_series(1, 100000) AS s
ON CONFLICT (order_log_id) DO NOTHING;
