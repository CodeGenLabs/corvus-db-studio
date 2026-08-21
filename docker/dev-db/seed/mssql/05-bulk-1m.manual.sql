-- Seed ~1,000,000 deterministic rows into order_log_bulk on-demand (SQL Server)
-- FR-011a, FR-011b, data-model.md §2

USE corvus_dev;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('corvus_dev.order_log_bulk'))
BEGIN
  CREATE TABLE corvus_dev.order_log_bulk (
    order_log_id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id  INT,
    amount       DECIMAL(12,2) NOT NULL,
    status       NVARCHAR(20) NOT NULL,
    placed_at    DATETIMEOFFSET NOT NULL,
    INDEX order_log_bulk_customer_idx (customer_id),
    INDEX order_log_bulk_placed_at_idx (placed_at),
    CONSTRAINT fk_order_log_bulk_customer FOREIGN KEY (customer_id) REFERENCES corvus_dev.customer (customer_id) ON DELETE CASCADE
  );
END
GO

SET IDENTITY_INSERT corvus_dev.order_log_bulk ON;
GO

WITH
  d0 AS (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  ),
  seq AS (
    SELECT (1 + d1.n + d2.n*10 + d3.n*100 + d4.n*1000 + d5.n*10000 + d6.n*100000) AS s
    FROM d0 d1, d0 d2, d0 d3, d0 d4, d0 d5, d0 d6
  )
INSERT INTO corvus_dev.order_log_bulk (order_log_id, customer_id, amount, status, placed_at)
SELECT
  s AS order_log_id,
  ((s - 1) % 10) + 1 AS customer_id,
  CAST((((s * 23) % 100000) + 500) / 100.0 AS DECIMAL(12,2)) AS amount,
  CASE (s % 4)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'pending'
    WHEN 2 THEN 'shipped'
    ELSE 'cancelled'
  END AS status,
  DATEADD(second, s * 10, '2026-01-01 00:00:00 +00:00') AS placed_at
FROM seq
WHERE s <= 1000000;
GO

SET IDENTITY_INSERT corvus_dev.order_log_bulk OFF;
GO
