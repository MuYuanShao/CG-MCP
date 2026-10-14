CREATE TABLE spd_instance (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name VARCHAR(200) NOT NULL,
  organization VARCHAR(80) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  token_env VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_spd_org (tenant_id, organization)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE spd_record (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  instance_id VARCHAR(36) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  source_code VARCHAR(100) NOT NULL,
  source_updated_at VARCHAR(40) NOT NULL,
  payload JSON NOT NULL,
  UNIQUE KEY uk_spd_record (tenant_id, instance_id, kind, source_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE spd_product_mapping (
  tenant_id BIGINT NOT NULL,
  instance_id VARCHAR(36) NOT NULL,
  product_id BIGINT NOT NULL,
  source_code VARCHAR(100) NOT NULL,
  source_updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (tenant_id, instance_id, product_id),
  UNIQUE KEY uk_spd_product_code (tenant_id, instance_id, source_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE spd_sync_log (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  instance_id VARCHAR(36) NOT NULL,
  batch_id VARCHAR(36) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  source_code VARCHAR(100) NOT NULL,
  state VARCHAR(30) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  payload JSON NOT NULL,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_spd_log (tenant_id, instance_id, created_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO sys_permission (id, permission_code, permission_name, resource_type)
SELECT next_id, 'integration:read', '采购对接查询', 'ACTION' FROM sys_id_sequence WHERE table_name = 'sys_permission';
UPDATE sys_id_sequence SET next_id = next_id + 1 WHERE table_name = 'sys_permission';
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type)
SELECT next_id, 'integration:manage', '采购对接配置及下发', 'ACTION' FROM sys_id_sequence WHERE table_name = 'sys_permission';
UPDATE sys_id_sequence SET next_id = next_id + 1 WHERE table_name = 'sys_permission';
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type)
SELECT next_id, 'integration:upload', '采购对接上传及回执', 'ACTION' FROM sys_id_sequence WHERE table_name = 'sys_permission';
UPDATE sys_id_sequence SET next_id = next_id + 1 WHERE table_name = 'sys_permission';
INSERT IGNORE INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id FROM sys_role r CROSS JOIN sys_permission p
WHERE r.role_code = 'admin' AND r.deleted = 0 AND p.permission_code LIKE 'integration:%';
