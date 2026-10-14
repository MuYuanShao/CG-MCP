CREATE TABLE IF NOT EXISTS sys_approval_data_scope (
  tenant_id BIGINT NOT NULL,
  workflow_code VARCHAR(80) NOT NULL,
  subject_type VARCHAR(20) NOT NULL,
  subject_id BIGINT NOT NULL,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, workflow_code, subject_type, subject_id),
  KEY idx_approval_scope_subject (tenant_id, subject_type, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='approval workflow role and user scope';

INSERT IGNORE INTO sys_approval_data_scope (tenant_id, workflow_code, subject_type, subject_id)
SELECT DISTINCT r.tenant_id, 'purchase_plan', 'ROLE', r.id
FROM sys_role r
JOIN sys_role_permission rp ON rp.role_id = r.id
JOIN sys_permission p ON p.id = rp.permission_id
WHERE r.deleted = 0 AND r.status = 1 AND p.permission_code = 'purchasePlans:approve';
