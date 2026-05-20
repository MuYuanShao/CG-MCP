DELIMITER $$
DROP PROCEDURE IF EXISTS add_product_package_column_if_missing$$
CREATE PROCEDURE add_product_package_column_if_missing(
  IN p_column_name VARCHAR(100),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = p_column_name
  ) THEN
    SET @product_package_alter_sql = p_alter_sql;
    PREPARE product_package_alter_statement FROM @product_package_alter_sql;
    EXECUTE product_package_alter_statement;
    DEALLOCATE PREPARE product_package_alter_statement;
  END IF;
END$$
DELIMITER ;

CALL add_product_package_column_if_missing(
  'medium_package',
  'ALTER TABLE biz_product ADD COLUMN medium_package INT NOT NULL DEFAULT 0 AFTER price'
);
CALL add_product_package_column_if_missing(
  'large_package',
  'ALTER TABLE biz_product ADD COLUMN large_package INT NOT NULL DEFAULT 0 AFTER medium_package'
);

DROP PROCEDURE add_product_package_column_if_missing;
