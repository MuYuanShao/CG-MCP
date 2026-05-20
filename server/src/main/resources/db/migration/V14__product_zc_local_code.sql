DELIMITER $$
DROP PROCEDURE IF EXISTS add_product_zc_local_code_if_missing$$
CREATE PROCEDURE add_product_zc_local_code_if_missing()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'zc_local_code'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN zc_local_code VARCHAR(100) NULL AFTER large_package;
  END IF;
END$$
DELIMITER ;

CALL add_product_zc_local_code_if_missing();

DROP PROCEDURE add_product_zc_local_code_if_missing;
