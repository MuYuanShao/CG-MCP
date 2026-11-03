CREATE TABLE spd_supply_outbox (
 message_id CHAR(36) NOT NULL PRIMARY KEY,
 tenant_id BIGINT NOT NULL,instance_id CHAR(36) NOT NULL,order_no VARCHAR(100) NOT NULL,
 supplier_code VARCHAR(100) NOT NULL,supply_no VARCHAR(100) NOT NULL,user_id BIGINT NOT NULL,
 request_hash CHAR(64) NOT NULL,payload JSON NOT NULL,target_endpoint VARCHAR(500) NOT NULL,
 state VARCHAR(20) NOT NULL DEFAULT 'pending',attempts INT NOT NULL DEFAULT 0,
 next_attempt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),lease_id CHAR(36) NULL,lease_until DATETIME(6) NULL,
 result JSON NULL,message VARCHAR(1000) NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 active_supply_no VARCHAR(100) GENERATED ALWAYS AS (CASE WHEN state='rejected' THEN NULL ELSE supply_no END) STORED,
 UNIQUE KEY uk_spd_supply_business(tenant_id,instance_id,order_no,supplier_code,active_supply_no),
 KEY ix_spd_supply_queue(state,next_attempt,lease_until),KEY ix_spd_supply_order(tenant_id,instance_id,order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO sys_permission(id,permission_code,permission_name,resource_type)
SELECT next_id,'integration:supply','医院订单供货回传','ACTION' FROM sys_id_sequence WHERE table_name='sys_permission';
UPDATE sys_id_sequence SET next_id=next_id+1 WHERE table_name='sys_permission';
INSERT IGNORE INTO sys_role_permission(role_id,permission_id)
SELECT r.id,p.id FROM sys_role r CROSS JOIN sys_permission p WHERE r.role_code='admin' AND r.deleted=0 AND p.permission_code='integration:supply';
