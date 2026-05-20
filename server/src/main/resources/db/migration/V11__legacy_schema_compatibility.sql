CREATE TABLE IF NOT EXISTS sys_id_sequence (
  table_name VARCHAR(100) PRIMARY KEY,
  next_id BIGINT NOT NULL,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='业务表 ID 序列';

CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  username VARCHAR(50) NOT NULL,
  real_name VARCHAR(50) NOT NULL DEFAULT '',
  phone VARCHAR(20),
  email VARCHAR(120),
  dept_name VARCHAR(100),
  password_hash VARCHAR(200),
  status TINYINT NOT NULL DEFAULT 1,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_user_tenant_username (tenant_id, username),
  KEY idx_user_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='user';

CREATE TABLE IF NOT EXISTS sys_role (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  data_scope VARCHAR(20) NOT NULL DEFAULT 'DATA_SCOPE_TENANT',
  status TINYINT NOT NULL DEFAULT 1,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_role_tenant_code (tenant_id, role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='role';

CREATE TABLE IF NOT EXISTS sys_permission (
  id BIGINT PRIMARY KEY,
  permission_code VARCHAR(100) NOT NULL UNIQUE,
  permission_name VARCHAR(100) NOT NULL,
  resource_type VARCHAR(30) NOT NULL DEFAULT 'ACTION',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='permission';

CREATE TABLE IF NOT EXISTS sys_user_role (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='user role relation';

CREATE TABLE IF NOT EXISTS sys_role_permission (
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='role permission relation';

CREATE TABLE IF NOT EXISTS sys_user_session (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked TINYINT NOT NULL DEFAULT 0,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sys_session_refresh_hash (refresh_token_hash),
  KEY idx_sys_session_user (tenant_id, user_id, revoked, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='user session';

DELIMITER $$
CREATE PROCEDURE legacy_add_column_if_missing(
  IN p_table_name VARCHAR(100),
  IN p_column_name VARCHAR(100),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table_name AND COLUMN_NAME = p_column_name
  ) THEN
    SET @legacy_alter_sql = p_alter_sql;
    PREPARE legacy_alter_statement FROM @legacy_alter_sql;
    EXECUTE legacy_alter_statement;
    DEALLOCATE PREPARE legacy_alter_statement;
  END IF;
END$$
DELIMITER ;

CALL legacy_add_column_if_missing('sys_user', 'real_name', 'ALTER TABLE sys_user ADD COLUMN real_name VARCHAR(50) NOT NULL DEFAULT '''' AFTER username');
CALL legacy_add_column_if_missing('sys_user', 'password_hash', 'ALTER TABLE sys_user ADD COLUMN password_hash VARCHAR(200) NULL AFTER real_name');
CALL legacy_add_column_if_missing('sys_permission', 'resource_type', 'ALTER TABLE sys_permission ADD COLUMN resource_type VARCHAR(30) NOT NULL DEFAULT ''ACTION'' AFTER permission_name');
CALL legacy_add_column_if_missing('biz_hospital', 'cooperation_date', 'ALTER TABLE biz_hospital ADD COLUMN cooperation_date DATE NULL AFTER status');
CALL legacy_add_column_if_missing('biz_product', 'category', 'ALTER TABLE biz_product ADD COLUMN category VARCHAR(80) NULL AFTER product_name');
CALL legacy_add_column_if_missing('biz_product', 'spec', 'ALTER TABLE biz_product ADD COLUMN spec VARCHAR(100) NULL AFTER category');
CALL legacy_add_column_if_missing('biz_product', 'model', 'ALTER TABLE biz_product ADD COLUMN model VARCHAR(100) NULL AFTER spec');
CALL legacy_add_column_if_missing('biz_product', 'unit', 'ALTER TABLE biz_product ADD COLUMN unit VARCHAR(20) NULL AFTER model');
CALL legacy_add_column_if_missing('biz_product', 'manufacturer', 'ALTER TABLE biz_product ADD COLUMN manufacturer VARCHAR(200) NULL AFTER unit');
CALL legacy_add_column_if_missing('biz_product', 'registration_no', 'ALTER TABLE biz_product ADD COLUMN registration_no VARCHAR(100) NULL AFTER manufacturer');
CALL legacy_add_column_if_missing('biz_product', 'udi_code', 'ALTER TABLE biz_product ADD COLUMN udi_code VARCHAR(200) NULL AFTER registration_no');
CALL legacy_add_column_if_missing('biz_product', 'price', 'ALTER TABLE biz_product ADD COLUMN price DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER udi_code');
CALL legacy_add_column_if_missing('biz_product', 'hospital_contract_code', 'ALTER TABLE biz_product ADD COLUMN hospital_contract_code VARCHAR(100) NULL AFTER price');
CALL legacy_add_column_if_missing('biz_delivery_order', 'delivery_date', 'ALTER TABLE biz_delivery_order ADD COLUMN delivery_date DATE NULL AFTER order_id');
CALL legacy_add_column_if_missing('biz_delivery_order', 'remark', 'ALTER TABLE biz_delivery_order ADD COLUMN remark VARCHAR(500) NULL AFTER status');

DROP PROCEDURE legacy_add_column_if_missing;

SET @legacy_password_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'password'
);
SET @legacy_password_sql := IF(@legacy_password_exists = 1, 'ALTER TABLE sys_user MODIFY COLUMN password VARCHAR(255) NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE legacy_password_statement FROM @legacy_password_sql;
EXECUTE legacy_password_statement;
DEALLOCATE PREPARE legacy_password_statement;

INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1001, 'refunds:create', 'Create refund', 'ACTION'),
  (1002, 'refunds:edit', 'Edit refund', 'ACTION'),
  (1003, 'refunds:approve', 'Approve refund', 'ACTION'),
  (1004, 'refunds:reject', 'Reject refund', 'ACTION'),
  (1005, 'refunds:outbound', 'Outbound refund', 'ACTION'),
  (1006, 'refunds:complete', 'Complete refund', 'ACTION'),
  (1007, 'refunds:export', 'Export refund', 'ACTION'),
  (1008, 'purchasePlans:create', 'Create purchase plan', 'ACTION'),
  (1009, 'purchasePlans:submit', 'Submit purchase plan', 'ACTION'),
  (1010, 'purchasePlans:approve', 'Approve purchase plan', 'ACTION'),
  (1011, 'purchasePlans:reject', 'Reject purchase plan', 'ACTION'),
  (1012, 'purchasePlans:convertToOrder', 'Convert plan to order', 'ACTION'),
  (1013, 'purchaseOrders:confirm', 'Confirm purchase order', 'ACTION'),
  (1014, 'purchaseOrders:createDelivery', 'Create delivery from order', 'ACTION'),
  (1015, 'deliveryOrders:pick', 'Pick delivery order', 'ACTION'),
  (1016, 'deliveryOrders:createShipment', 'Create shipment from delivery', 'ACTION'),
  (1017, 'deliveryOrders:recall', 'Recall delivery order', 'ACTION'),
  (1018, 'shipmentOrders:outbound', 'Outbound shipment', 'ACTION'),
  (1019, 'shipmentOrders:markTransit', 'Mark shipment in transit', 'ACTION'),
  (1020, 'shipmentOrders:sign', 'Sign shipment', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

INSERT INTO sys_role (id, tenant_id, role_code, role_name)
VALUES (1001, 1, 'admin', 'System administrator')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), deleted = 0, status = 1;

INSERT IGNORE INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM sys_role r
JOIN sys_permission p ON p.permission_code IN (
  'refunds:create', 'refunds:edit', 'refunds:approve', 'refunds:reject', 'refunds:outbound', 'refunds:complete', 'refunds:export',
  'purchasePlans:create', 'purchasePlans:submit', 'purchasePlans:approve', 'purchasePlans:reject', 'purchasePlans:convertToOrder',
  'purchaseOrders:confirm', 'purchaseOrders:createDelivery',
  'deliveryOrders:pick', 'deliveryOrders:createShipment', 'deliveryOrders:recall',
  'shipmentOrders:outbound', 'shipmentOrders:markTransit', 'shipmentOrders:sign'
)
WHERE r.tenant_id = 1 AND r.role_code = 'admin' AND r.deleted = 0;

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_hospital', COALESCE(MAX(id), 0) + 1 FROM biz_hospital
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_supplier', COALESCE(MAX(id), 0) + 1 FROM biz_supplier
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_product', COALESCE(MAX(id), 0) + 1 FROM biz_product
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_refund', COALESCE(MAX(id), 0) + 1 FROM biz_refund
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_purchase_order', COALESCE(MAX(id), 0) + 1 FROM biz_purchase_order
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_delivery_order', COALESCE(MAX(id), 0) + 1 FROM biz_delivery_order
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_delivery_order_item', COALESCE(MAX(id), 0) + 1 FROM biz_delivery_order_item
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_shipment_order', COALESCE(MAX(id), 0) + 1 FROM biz_shipment_order
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'sys_user', GREATEST(COALESCE(MAX(id), 0) + 1, 1002) FROM sys_user
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'sys_role', GREATEST(COALESCE(MAX(id), 0) + 1, 1002) FROM sys_role
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'sys_permission', GREATEST(COALESCE(MAX(id), 0) + 1, 1021) FROM sys_permission
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'sys_user_session', COALESCE(MAX(id), 0) + 1 FROM sys_user_session
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));
