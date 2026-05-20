CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  username VARCHAR(50) NOT NULL,
  real_name VARCHAR(50) NOT NULL,
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
  resource_type VARCHAR(30) NOT NULL,
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

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'sys_user', COALESCE(MAX(id), 0) + 1 FROM sys_user
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'sys_role', COALESCE(MAX(id), 0) + 1 FROM sys_role
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'sys_permission', COALESCE(MAX(id), 0) + 1 FROM sys_permission
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'sys_user_session', COALESCE(MAX(id), 0) + 1 FROM sys_user_session
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

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

UPDATE sys_id_sequence SET next_id = GREATEST(next_id, 1002) WHERE table_name IN ('sys_user', 'sys_role');
UPDATE sys_id_sequence SET next_id = GREATEST(next_id, 1021) WHERE table_name = 'sys_permission';