CREATE TABLE IF NOT EXISTS biz_supplier (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  supplier_code VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  city VARCHAR(80),
  contact_name VARCHAR(50),
  contact_phone VARCHAR(20),
  status TINYINT NOT NULL DEFAULT 1,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_supplier_tenant_code (tenant_id, supplier_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商';

DELIMITER $$
DROP PROCEDURE IF EXISTS add_save_columns_if_missing$$
CREATE PROCEDURE add_save_columns_if_missing(
  IN p_table_name VARCHAR(100),
  IN p_column_name VARCHAR(100),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table_name AND COLUMN_NAME = p_column_name
  ) THEN
    SET @save_columns_alter_sql = p_alter_sql;
    PREPARE save_columns_alter_statement FROM @save_columns_alter_sql;
    EXECUTE save_columns_alter_statement;
    DEALLOCATE PREPARE save_columns_alter_statement;
  END IF;
END$$
DELIMITER ;

CALL add_save_columns_if_missing('biz_supplier', 'tenant_id', 'ALTER TABLE biz_supplier ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1');
CALL add_save_columns_if_missing('biz_supplier', 'supplier_code', 'ALTER TABLE biz_supplier ADD COLUMN supplier_code VARCHAR(50) NOT NULL DEFAULT ''''');
CALL add_save_columns_if_missing('biz_supplier', 'supplier_name', 'ALTER TABLE biz_supplier ADD COLUMN supplier_name VARCHAR(200) NOT NULL DEFAULT ''''');
CALL add_save_columns_if_missing('biz_supplier', 'category', 'ALTER TABLE biz_supplier ADD COLUMN category VARCHAR(80) NULL');
CALL add_save_columns_if_missing('biz_supplier', 'city', 'ALTER TABLE biz_supplier ADD COLUMN city VARCHAR(80) NULL');
CALL add_save_columns_if_missing('biz_supplier', 'contact_name', 'ALTER TABLE biz_supplier ADD COLUMN contact_name VARCHAR(50) NULL');
CALL add_save_columns_if_missing('biz_supplier', 'contact_phone', 'ALTER TABLE biz_supplier ADD COLUMN contact_phone VARCHAR(20) NULL');
CALL add_save_columns_if_missing('biz_supplier', 'status', 'ALTER TABLE biz_supplier ADD COLUMN status TINYINT NOT NULL DEFAULT 1');
CALL add_save_columns_if_missing('biz_supplier', 'created_time', 'ALTER TABLE biz_supplier ADD COLUMN created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_save_columns_if_missing('biz_supplier', 'updated_time', 'ALTER TABLE biz_supplier ADD COLUMN updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL add_save_columns_if_missing('biz_supplier', 'deleted', 'ALTER TABLE biz_supplier ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0');

DROP PROCEDURE add_save_columns_if_missing;

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_supplier', COALESCE(MAX(id), 0) + 1 FROM biz_supplier
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));
