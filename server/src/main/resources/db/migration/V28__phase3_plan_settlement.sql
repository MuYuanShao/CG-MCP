CREATE TABLE spd_phase3_document (
 tenant_id BIGINT NOT NULL, instance_id CHAR(36) NOT NULL, document_type VARCHAR(30) NOT NULL, source_id VARCHAR(20) NOT NULL,
 revision BIGINT NOT NULL, operation VARCHAR(10) NOT NULL, document_no VARCHAR(100) NOT NULL, supplier_code VARCHAR(100) NOT NULL,
 source_status VARCHAR(30) NOT NULL, source_updated_at VARCHAR(40) NOT NULL, payload_hash CHAR(64) NOT NULL,
 total_amount DECIMAL(18,4) NULL, currency CHAR(3) NULL, tax_included TINYINT NULL, payload JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(tenant_id,instance_id,document_type,source_id),
 KEY ix_phase3_supplier(tenant_id,instance_id,supplier_code,document_type,updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE spd_phase3_item (
 tenant_id BIGINT NOT NULL,instance_id CHAR(36) NOT NULL,document_type VARCHAR(30) NOT NULL,source_id VARCHAR(20) NOT NULL,
 line_id VARCHAR(20) NOT NULL,payload JSON NOT NULL,
 PRIMARY KEY(tenant_id,instance_id,document_type,source_id,line_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE spd_phase3_history (
 tenant_id BIGINT NOT NULL,instance_id CHAR(36) NOT NULL,document_type VARCHAR(30) NOT NULL,source_id VARCHAR(20) NOT NULL,
 revision BIGINT NOT NULL,payload_hash CHAR(64) NOT NULL,envelope JSON NOT NULL,received_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(tenant_id,instance_id,document_type,source_id,revision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE spd_phase3_receipt (
 tenant_id BIGINT NOT NULL,instance_id CHAR(36) NOT NULL,message_id CHAR(36) NOT NULL,payload_hash CHAR(64) NOT NULL,result_json JSON NOT NULL,
 PRIMARY KEY(tenant_id,instance_id,message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE spd_phase3_source_claim (
 tenant_id BIGINT NOT NULL,instance_id CHAR(36) NOT NULL,source_biz_type VARCHAR(50) NOT NULL,source_biz_id VARCHAR(20) NOT NULL,settlement_id VARCHAR(20) NOT NULL,
 PRIMARY KEY(tenant_id,instance_id,source_biz_type,source_biz_id),KEY ix_phase3_claim_bill(tenant_id,instance_id,settlement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE spd_phase3_session (
 id CHAR(36) NOT NULL PRIMARY KEY,tenant_id BIGINT NOT NULL,instance_id CHAR(36) NOT NULL,message_id CHAR(36) NOT NULL,
 document_type VARCHAR(30) NOT NULL,source_id VARCHAR(20) NOT NULL,revision BIGINT NOT NULL,
 manifest_hash CHAR(64) NOT NULL,manifest JSON NOT NULL,total_lines INT NOT NULL,total_parts INT NOT NULL,
 expires_at DATETIME(6) NOT NULL,UNIQUE KEY uk_phase3_session(tenant_id,instance_id,message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE spd_phase3_part (
 session_id CHAR(36) NOT NULL,part_no INT NOT NULL,payload_hash CHAR(64) NOT NULL,items JSON NOT NULL,
 PRIMARY KEY(session_id,part_no),CONSTRAINT fk_phase3_part FOREIGN KEY(session_id) REFERENCES spd_phase3_session(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE spd_phase3_supplier_access (
 tenant_id BIGINT NOT NULL,instance_id CHAR(36) NOT NULL,user_id BIGINT NOT NULL,supplier_code VARCHAR(100) NOT NULL,
 PRIMARY KEY(tenant_id,instance_id,user_id,supplier_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE spd_phase3_feedback (
 message_id CHAR(36) NOT NULL PRIMARY KEY,tenant_id BIGINT NOT NULL,instance_id CHAR(36) NOT NULL,source_id VARCHAR(20) NOT NULL,
 revision BIGINT NOT NULL,supplier_code VARCHAR(100) NOT NULL,user_id BIGINT NOT NULL,request_hash CHAR(64) NOT NULL,payload JSON NOT NULL,
 state VARCHAR(20) NOT NULL DEFAULT 'pending',attempts INT NOT NULL DEFAULT 0,next_attempt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 lease_id CHAR(36) NULL,lease_until DATETIME(6) NULL,message VARCHAR(500) NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY ix_phase3_feedback(state,next_attempt,lease_until),KEY ix_phase3_feedback_bill(tenant_id,instance_id,source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO sys_permission(id,permission_code,permission_name,resource_type)
SELECT next_id,'integration:phase3:read','医院计划与结算查询','ACTION' FROM sys_id_sequence WHERE table_name='sys_permission';
UPDATE sys_id_sequence SET next_id=next_id+1 WHERE table_name='sys_permission';
INSERT INTO sys_permission(id,permission_code,permission_name,resource_type)
SELECT next_id,'integration:reconcile','供应商结算协同反馈','ACTION' FROM sys_id_sequence WHERE table_name='sys_permission';
UPDATE sys_id_sequence SET next_id=next_id+1 WHERE table_name='sys_permission';
INSERT IGNORE INTO sys_role_permission(role_id,permission_id)
SELECT r.id,p.id FROM sys_role r CROSS JOIN sys_permission p WHERE r.role_code='admin' AND r.deleted=0 AND p.permission_code IN ('integration:phase3:read','integration:reconcile');
