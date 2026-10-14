-- 验收管理（仅展示 SPD 院内系统传输的验收数据）
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1053, 'acceptance:view', '查看验收单', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 为 admin 角色分配验收管理权限
INSERT IGNORE INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM sys_role r
JOIN sys_permission p ON p.permission_code IN ('acceptance:view')
WHERE r.tenant_id = 1 AND r.role_code = 'admin' AND r.deleted = 0;

-- 更新 id 序列
UPDATE sys_id_sequence SET next_id = GREATEST(next_id, 1054) WHERE table_name = 'sys_permission';
