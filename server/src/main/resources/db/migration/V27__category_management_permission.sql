INSERT INTO sys_permission (id, permission_code, permission_name, resource_type)
SELECT next_id, 'categories:manage', '商品分类维护', 'ACTION'
FROM sys_id_sequence WHERE table_name = 'sys_permission';
UPDATE sys_id_sequence SET next_id = next_id + 1 WHERE table_name = 'sys_permission';

INSERT IGNORE INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id FROM sys_role r CROSS JOIN sys_permission p
WHERE LOWER(r.role_code) IN ('admin', 'role_admin', 'spd_admin', 'system_admin')
  AND r.deleted = 0 AND p.permission_code = 'categories:manage';
