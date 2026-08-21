-- Dev environment extensions for corvus_dev (MySQL / MariaDB)
-- data-model.md §2, FR-009, FR-010, SR-004

SET NAMES utf8mb4;
USE corvus_dev;

-- 6. Customer (thực thể nghiệp vụ mở rộng)
CREATE TABLE IF NOT EXISTS customer (
  customer_id  INT AUTO_INCREMENT PRIMARY KEY,
  country_id   SMALLINT,
  email        VARCHAR(100) NOT NULL,
  full_name    VARCHAR(100) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  UNIQUE KEY customer_email_uq (email),
  INDEX customer_country_idx (country_id),
  CONSTRAINT fk_customer_country FOREIGN KEY (country_id) REFERENCES country (country_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. order_log (bảng chứa ~100k dòng mẫu)
CREATE TABLE IF NOT EXISTS order_log (
  order_log_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT,
  amount       DECIMAL(12,2) NOT NULL,
  status       VARCHAR(20) NOT NULL,
  placed_at    DATETIME NOT NULL,
  INDEX order_log_customer_idx (customer_id),
  INDEX order_log_placed_at_idx (placed_at),
  INDEX order_log_status_idx (status),
  CONSTRAINT fk_order_log_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. customer_summary (view tổng hợp có aggregate)
CREATE OR REPLACE VIEW customer_summary AS
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

-- 9. fn_customer_total (stored routine)
DROP FUNCTION IF EXISTS fn_customer_total;
DELIMITER //
CREATE FUNCTION fn_customer_total(p_customer_id INT)
RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE total DECIMAL(12,2);
  SELECT COALESCE(SUM(amount), 0) INTO total FROM order_log WHERE customer_id = p_customer_id;
  RETURN total;
END //
DELIMITER ;

-- 10. trg_order_log_touch (trigger)
DROP TRIGGER IF EXISTS trg_order_log_touch;
DELIMITER //
CREATE TRIGGER trg_order_log_touch
BEFORE INSERT ON order_log
FOR EACH ROW
BEGIN
  IF NEW.placed_at IS NULL THEN
    SET NEW.placed_at = CURRENT_TIMESTAMP;
  END IF;
END //
DELIMITER ;

-- 11. corvus_env_marker (dấu hiệu môi trường phát triển & chốt an toàn SR-005, FR-012)
CREATE TABLE IF NOT EXISTS corvus_env_marker (
  `key`        VARCHAR(50) PRIMARY KEY,
  `value`      VARCHAR(255) NOT NULL,
  seeded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seed_version VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

-- Seed customer data (SR-004: fake data only, @example.invalid)
INSERT INTO customer (customer_id, country_id, email, full_name, created_at, is_active) VALUES
  (1, 1, 'customer0001@example.invalid', 'Nguyen Van A', '2026-01-01 08:00:00', true),
  (2, 1, 'customer0002@example.invalid', 'Tran Thi B', '2026-01-02 09:30:00', true),
  (3, 2, 'customer0003@example.invalid', 'Kenji Sato', '2026-01-03 10:15:00', true),
  (4, 2, 'customer0004@example.invalid', 'Yuki Tanaka', '2026-01-04 11:00:00', false),
  (5, 3, 'customer0005@example.invalid', 'Lucas Silva', '2026-01-05 12:45:00', true),
  (6, 3, 'customer0006@example.invalid', 'Beatriz Souza', '2026-01-06 14:20:00', true)
ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id);

-- Seed marker
INSERT INTO corvus_env_marker (`key`, `value`, seeded_at, seed_version) VALUES
  ('corvus_dev', 'ready', '2026-01-01 00:00:00', '1.0.0')
ON DUPLICATE KEY UPDATE
  `value` = VALUES(`value`),
  seeded_at = VALUES(seeded_at),
  seed_version = VALUES(seed_version);
