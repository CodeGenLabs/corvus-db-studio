-- Schema definition for core conformance entities (MySQL / MariaDB)
-- data-model.md §1 & §2

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS corvus_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE corvus_dev;

-- 1. Country (kế thừa từ corvus_conf)
CREATE TABLE IF NOT EXISTS country (
  country_id   SMALLINT AUTO_INCREMENT PRIMARY KEY,
  country      VARCHAR(50) NOT NULL,
  iso_code     CHAR(2) COMMENT 'ISO 3166-1 alpha-2',
  last_update  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY country_name_uq (country)
) ENGINE=InnoDB COMMENT = 'Bảng quốc gia dùng cho conformance';

-- 2. City (kế thừa từ corvus_conf)
CREATE TABLE IF NOT EXISTS city (
  city_id    INT AUTO_INCREMENT PRIMARY KEY,
  country_id SMALLINT NOT NULL,
  city       VARCHAR(50) NOT NULL,
  note       TEXT,
  INDEX city_country_idx (country_id),
  CONSTRAINT fk_city_country FOREIGN KEY (country_id) REFERENCES country (country_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. `order details` (quoting check: tên có dấu cách, unicode, từ khoá SQL)
CREATE TABLE IF NOT EXISTS `order details` (
  id          INT PRIMARY KEY,
  `sản lượng` DECIMAL(20,4),
  `select`    TEXT
) ENGINE=InnoDB;

-- 4. types_probe (kiểm tra kiểu dữ liệu đặc thù, bigint > 2^53, numeric, json, blob)
CREATE TABLE IF NOT EXISTS types_probe (
  id          INT PRIMARY KEY,
  big_val     BIGINT,
  numeric_val DECIMAL(30,10),
  bool_val    BOOLEAN,
  text_null   TEXT,
  text_empty  TEXT,
  json_val    JSON,
  bytes_val   BLOB,
  ts_val      DATETIME
) ENGINE=InnoDB;

-- 5. city_view (view join cơ bản)
CREATE OR REPLACE VIEW city_view AS
  SELECT c.city_id, c.city, n.country
  FROM city c JOIN country n ON n.country_id = c.country_id;
