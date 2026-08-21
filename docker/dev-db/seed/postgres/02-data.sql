-- Seed core conformance deterministic data (PostgreSQL)
-- data-model.md §1 & §2

INSERT INTO corvus_dev.country (country_id, country, iso_code) VALUES
  (1, 'Việt Nam', 'VN'),
  (2, 'Japan', 'JP'),
  (3, 'Brazil', 'BR')
ON CONFLICT (country_id) DO NOTHING;

INSERT INTO corvus_dev.city (city_id, country_id, city, note) VALUES
  (1, 1, 'Hà Nội', NULL),
  (2, 1, 'Đà Nẵng', ''),
  (3, 2, 'Tokyo', 'thủ đô')
ON CONFLICT (city_id) DO NOTHING;

INSERT INTO corvus_dev."order details" (id, "sản lượng", "select") VALUES
  (1, 1250.5000, 'standard selection')
ON CONFLICT (id) DO NOTHING;

INSERT INTO corvus_dev.types_probe
  (id, big_val, numeric_val, bool_val, text_null, text_empty, json_val, bytes_val, ts_val) VALUES
  (1, 9223372036854775807, 12345678901234567890.0123456789, true,
   NULL, '', '{"a":[1,2,3]}'::jsonb, '\xdeadbeef'::bytea, '2026-08-18T09:00:00Z')
ON CONFLICT (id) DO NOTHING;
