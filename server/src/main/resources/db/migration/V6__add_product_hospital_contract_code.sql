SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'biz_product'
    AND COLUMN_NAME = 'hospital_contract_code'
);

SET @add_column_sql := IF(
  @column_exists = 0,
  'ALTER TABLE biz_product ADD COLUMN hospital_contract_code VARCHAR(100) NULL AFTER price',
  'SELECT 1'
);

PREPARE add_column_statement FROM @add_column_sql;
EXECUTE add_column_statement;
DEALLOCATE PREPARE add_column_statement;
