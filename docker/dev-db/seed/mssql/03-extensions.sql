-- Dev environment extensions for corvus_dev (SQL Server)
-- data-model.md §2, FR-009, FR-010, SR-004

USE corvus_dev;
GO

-- 6. Customer (thực thể nghiệp vụ mở rộng)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('corvus_dev.customer'))
BEGIN
  CREATE TABLE corvus_dev.customer (
    customer_id  INT IDENTITY(1,1) PRIMARY KEY,
    country_id   SMALLINT,
    email        NVARCHAR(100) NOT NULL,
    full_name    NVARCHAR(100) NOT NULL,
    created_at   DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    is_active    BIT NOT NULL DEFAULT 1,
    CONSTRAINT customer_email_uq UNIQUE (email),
    INDEX customer_country_idx (country_id),
    CONSTRAINT fk_customer_country FOREIGN KEY (country_id) REFERENCES corvus_dev.country (country_id) ON DELETE SET NULL
  );
END
GO

-- 7. order_log (bảng chứa ~100k dòng mẫu)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('corvus_dev.order_log'))
BEGIN
  CREATE TABLE corvus_dev.order_log (
    order_log_id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id  INT,
    amount       DECIMAL(12,2) NOT NULL,
    status       NVARCHAR(20) NOT NULL,
    placed_at    DATETIMEOFFSET NOT NULL,
    INDEX order_log_customer_idx (customer_id),
    INDEX order_log_placed_at_idx (placed_at),
    INDEX order_log_status_idx (status),
    CONSTRAINT fk_order_log_customer FOREIGN KEY (customer_id) REFERENCES corvus_dev.customer (customer_id) ON DELETE CASCADE
  );
END
GO

-- 8. customer_summary (view tổng hợp có aggregate)
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID('corvus_dev.customer_summary'))
  DROP VIEW corvus_dev.customer_summary;
GO
CREATE VIEW corvus_dev.customer_summary AS
  SELECT
    c.customer_id,
    c.full_name,
    c.email,
    co.country,
    COUNT(o.order_log_id) AS total_orders,
    COALESCE(SUM(o.amount), 0) AS total_spent
  FROM corvus_dev.customer c
  LEFT JOIN corvus_dev.country co ON co.country_id = c.country_id
  LEFT JOIN corvus_dev.order_log o ON o.customer_id = c.customer_id
  GROUP BY c.customer_id, c.full_name, c.email, co.country;
GO

-- 9. fn_customer_total (stored routine)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('corvus_dev.fn_customer_total'))
  DROP FUNCTION corvus_dev.fn_customer_total;
GO
CREATE FUNCTION corvus_dev.fn_customer_total(@customer_id INT)
RETURNS DECIMAL(12,2)
AS
BEGIN
  DECLARE @total DECIMAL(12,2);
  SELECT @total = COALESCE(SUM(amount), 0) FROM corvus_dev.order_log WHERE customer_id = @customer_id;
  RETURN @total;
END
GO

-- 10. trg_order_log_touch (trigger)
IF EXISTS (SELECT * FROM sys.triggers WHERE object_id = OBJECT_ID('corvus_dev.trg_order_log_touch'))
  DROP TRIGGER corvus_dev.trg_order_log_touch;
GO
CREATE TRIGGER trg_order_log_touch
ON corvus_dev.order_log
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
END
GO

-- 11. corvus_env_marker (dấu hiệu môi trường phát triển & chốt an toàn SR-005, FR-012)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('corvus_dev.corvus_env_marker'))
BEGIN
  CREATE TABLE corvus_dev.corvus_env_marker (
    [key]        NVARCHAR(50) PRIMARY KEY,
    [value]      NVARCHAR(255) NOT NULL,
    seeded_at    DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    seed_version NVARCHAR(50) NOT NULL
  );
END
GO

-- Seed customer data (SR-004: fake data only, @example.invalid)
SET IDENTITY_INSERT corvus_dev.customer ON;
IF NOT EXISTS (SELECT 1 FROM corvus_dev.customer WHERE customer_id = 1)
  INSERT INTO corvus_dev.customer (customer_id, country_id, email, full_name, created_at, is_active)
  VALUES
    (1, 1, N'customer0001@example.invalid', N'Nguyen Van A', '2026-01-01 08:00:00 +00:00', 1),
    (2, 1, N'customer0002@example.invalid', N'Tran Thi B', '2026-01-02 09:30:00 +00:00', 1),
    (3, 2, N'customer0003@example.invalid', N'Kenji Sato', '2026-01-03 10:15:00 +00:00', 1),
    (4, 2, N'customer0004@example.invalid', N'Yuki Tanaka', '2026-01-04 11:00:00 +00:00', 0),
    (5, 3, N'customer0005@example.invalid', N'Lucas Silva', '2026-01-05 12:45:00 +00:00', 1),
    (6, 3, N'customer0006@example.invalid', N'Beatriz Souza', '2026-01-06 14:20:00 +00:00', 1);
SET IDENTITY_INSERT corvus_dev.customer OFF;
GO

-- Seed marker
IF NOT EXISTS (SELECT 1 FROM corvus_dev.corvus_env_marker WHERE [key] = 'corvus_dev')
  INSERT INTO corvus_dev.corvus_env_marker ([key], [value], seeded_at, seed_version)
  VALUES ('corvus_dev', 'ready', '2026-01-01 00:00:00 +00:00', '1.0.0');
ELSE
  UPDATE corvus_dev.corvus_env_marker
  SET [value] = 'ready', seeded_at = '2026-01-01 00:00:00 +00:00', seed_version = '1.0.0'
  WHERE [key] = 'corvus_dev';
GO
