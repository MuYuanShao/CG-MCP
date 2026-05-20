SET @column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'password_hash'
);
SET @add_column_sql := IF(@column_exists = 0, 'ALTER TABLE sys_user ADD COLUMN password_hash VARCHAR(200) NULL AFTER dept_name', 'SELECT 1');
PREPARE add_column_statement FROM @add_column_sql;
EXECUTE add_column_statement;
DEALLOCATE PREPARE add_column_statement;

SET @column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'real_name'
);
SET @add_column_sql := IF(@column_exists = 0, 'ALTER TABLE sys_user ADD COLUMN real_name VARCHAR(50) NOT NULL DEFAULT '''' AFTER username', 'SELECT 1');
PREPARE add_column_statement FROM @add_column_sql;
EXECUTE add_column_statement;
DEALLOCATE PREPARE add_column_statement;

SET @column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_permission' AND COLUMN_NAME = 'resource_type'
);
SET @add_column_sql := IF(@column_exists = 0, 'ALTER TABLE sys_permission ADD COLUMN resource_type VARCHAR(30) NOT NULL DEFAULT ''ACTION'' AFTER permission_name', 'SELECT 1');
PREPARE add_column_statement FROM @add_column_sql;
EXECUTE add_column_statement;
DEALLOCATE PREPARE add_column_statement;
