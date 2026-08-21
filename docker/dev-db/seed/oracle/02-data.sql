-- Seed core conformance deterministic data (Oracle)
-- data-model.md §1 & §2

INSERT INTO country (country_id, country, iso_code) VALUES (1, 'Việt Nam', 'VN');
INSERT INTO country (country_id, country, iso_code) VALUES (2, 'Japan', 'JP');
INSERT INTO country (country_id, country, iso_code) VALUES (3, 'Brazil', 'BR');

INSERT INTO city (city_id, country_id, city, note) VALUES (1, 1, 'Hà Nội', NULL);
INSERT INTO city (city_id, country_id, city, note) VALUES (2, 1, 'Đà Nẵng', '');
INSERT INTO city (city_id, country_id, city, note) VALUES (3, 2, 'Tokyo', 'thủ đô');

INSERT INTO "order details" (id, "sản lượng", "select") VALUES (1, 1250.5000, 'standard selection');

INSERT INTO types_probe (id, big_val, numeric_val, bool_val, text_null, text_empty, json_val, bytes_val, ts_val)
VALUES (1, 9223372036854775807, 12345678901234567890.0123456789, 1, NULL, '', '{"a":[1,2,3]}', HEXTORAW('DEADBEEF'), TIMESTAMP '2026-08-18 09:00:00 UTC');

COMMIT;
