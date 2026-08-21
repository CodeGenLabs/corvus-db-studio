-- Schema definition for core conformance entities (SQL Server)
-- data-model.md §1 & §2

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'corvus_dev')
BEGIN
  CREATE DATABASE corvus_dev;
END
GO

USE corvus_dev;
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'corvus_dev')
BEGIN
  EXEC('CREATE SCHEMA corvus_dev');
END
GO

-- 1. Country (kế thừa từ corvus_conf)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('corvus_dev.country'))
BEGIN
  CREATE TABLE corvus_dev.country (
    country_id   SMALLINT IDENTITY(1,1) PRIMARY KEY,
    country      NVARCHAR(50) NOT NULL,
    iso_code     NCHAR(2),
    last_update  DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
  CREATE UNIQUE INDEX country_name_uq ON corvus_dev.country (country);
  EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'ISO 3166-1 alpha-2', 
    @level0type=N'SCHEMA',@level0name=N'corvus_dev', 
    @level1type=N'TABLE',@level1name=N'country', 
    @level2type=N'COLUMN',@level2name=N'iso_code';
END
GO

-- 2. City (kế thừa từ corvus_conf)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('corvus_dev.city'))
BEGIN
  CREATE TABLE corvus_dev.city (
    city_id    INT IDENTITY(1,1) PRIMARY KEY,
    country_id SMALLINT NOT NULL,
    city       NVARCHAR(50) NOT NULL,
    note       NVARCHAR(MAX),
    INDEX city_country_idx (country_id),
    CONSTRAINT fk_city_country FOREIGN KEY (country_id) REFERENCES corvus_dev.country (country_id) ON DELETE CASCADE
  );
END
GO

-- 3. [order details] (quoting check: tên có dấu cách, unicode, từ khoá SQL)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('corvus_dev.[order details]'))
BEGIN
  CREATE TABLE corvus_dev.[order details] (
    id          INT PRIMARY KEY,
    [sản lượng] DECIMAL(20,4),
    [select]    NVARCHAR(MAX)
  );
END
GO

-- 4. types_probe (kiểm tra kiểu dữ liệu đặc thù, bigint > 2^53, numeric, datetimeoffset, varbinary)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('corvus_dev.types_probe'))
BEGIN
  CREATE TABLE corvus_dev.types_probe (
    id          INT PRIMARY KEY,
    big_val     BIGINT,
    numeric_val DECIMAL(30,10),
    bool_val    BIT,
    text_null   NVARCHAR(MAX),
    text_empty  NVARCHAR(MAX),
    json_val    NVARCHAR(MAX),
    bytes_val   VARBINARY(MAX),
    ts_val      DATETIMEOFFSET
  );
END
GO

-- 5. city_view (view join cơ bản)
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID('corvus_dev.city_view'))
  DROP VIEW corvus_dev.city_view;
GO
CREATE VIEW corvus_dev.city_view AS
  SELECT c.city_id, c.city, n.country
  FROM corvus_dev.city c
  JOIN corvus_dev.country n ON n.country_id = c.country_id;
GO
