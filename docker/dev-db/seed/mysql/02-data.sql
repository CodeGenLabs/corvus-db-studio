-- Seed core conformance deterministic data (MySQL / MariaDB)
-- data-model.md §1 & §2

SET NAMES utf8mb4;
USE corvus_dev;

INSERT INTO country (country_id, country, iso_code) VALUES
  (1, 'Việt Nam', 'VN'),
  (2, 'Japan', 'JP'),
  (3, 'Brazil', 'BR')
ON DUPLICATE KEY UPDATE country_id = VALUES(country_id);

INSERT INTO city (city_id, country_id, city, note) VALUES
  (1, 1, 'Hà Nội', NULL),
  (2, 1, 'Đà Nẵng', ''),
  (3, 2, 'Tokyo', 'thủ đô')
ON DUPLICATE KEY UPDATE city_id = VALUES(city_id);

INSERT INTO `order details` (id, `sản lượng`, `select`) VALUES
  (1, 1250.5000, 'standard selection')
ON DUPLICATE KEY UPDATE id = VALUES(id);

INSERT INTO types_probe
  (id, big_val, numeric_val, bool_val, text_null, text_empty, json_val, bytes_val, ts_val) VALUES
  (1, 9223372036854775807, 12345678901234567890.0123456789, 1,
   NULL, '', '{"a":[1,2,3]}', X'deadbeef', '2026-08-18 09:00:00')
ON DUPLICATE KEY UPDATE id = VALUES(id);
