-- Seed core conformance deterministic data (SQL Server)
-- data-model.md §1 & §2

USE corvus_dev;
GO

SET IDENTITY_INSERT corvus_dev.country ON;
IF NOT EXISTS (SELECT 1 FROM corvus_dev.country WHERE country_id = 1)
  INSERT INTO corvus_dev.country (country_id, country, iso_code)
  VALUES (1, N'Việt Nam', 'VN');
IF NOT EXISTS (SELECT 1 FROM corvus_dev.country WHERE country_id = 2)
  INSERT INTO corvus_dev.country (country_id, country, iso_code)
  VALUES (2, N'Japan', 'JP');
IF NOT EXISTS (SELECT 1 FROM corvus_dev.country WHERE country_id = 3)
  INSERT INTO corvus_dev.country (country_id, country, iso_code)
  VALUES (3, N'Brazil', 'BR');
SET IDENTITY_INSERT corvus_dev.country OFF;
GO

SET IDENTITY_INSERT corvus_dev.city ON;
IF NOT EXISTS (SELECT 1 FROM corvus_dev.city WHERE city_id = 1)
  INSERT INTO corvus_dev.city (city_id, country_id, city, note)
  VALUES (1, 1, N'Hà Nội', NULL);
IF NOT EXISTS (SELECT 1 FROM corvus_dev.city WHERE city_id = 2)
  INSERT INTO corvus_dev.city (city_id, country_id, city, note)
  VALUES (2, 1, N'Đà Nẵng', '');
IF NOT EXISTS (SELECT 1 FROM corvus_dev.city WHERE city_id = 3)
  INSERT INTO corvus_dev.city (city_id, country_id, city, note)
  VALUES (3, 2, N'Tokyo', N'thủ đô');
SET IDENTITY_INSERT corvus_dev.city OFF;
GO

IF NOT EXISTS (SELECT 1 FROM corvus_dev.[order details] WHERE id = 1)
  INSERT INTO corvus_dev.[order details] (id, [sản lượng], [select])
  VALUES (1, 1250.5000, N'standard selection');
GO

IF NOT EXISTS (SELECT 1 FROM corvus_dev.types_probe WHERE id = 1)
  INSERT INTO corvus_dev.types_probe (id, big_val, numeric_val, bool_val, text_null, text_empty, json_val, bytes_val, ts_val)
  VALUES (1, 9223372036854775807, 12345678901234567890.0123456789, 1,
          NULL, '', '{"a":[1,2,3]}', 0xdeadbeef, '2026-08-18 09:00:00 +00:00');
GO
