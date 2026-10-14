-- 医院管理
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1021, 'hospitals:create', '创建医院', 'ACTION'),
  (1022, 'hospitals:edit', '编辑医院', 'ACTION'),
  (1023, 'hospitals:delete', '删除医院', 'ACTION'),
  (1024, 'hospitals:assignSupplier', '分配供应商', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 供应商管理
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1025, 'suppliers:create', '创建供应商', 'ACTION'),
  (1026, 'suppliers:edit', '编辑供应商', 'ACTION'),
  (1027, 'suppliers:delete', '删除供应商', 'ACTION'),
  (1028, 'suppliers:assignHospital', '分配医院', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 目录管理
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1029, 'products:create', '创建商品', 'ACTION'),
  (1030, 'products:edit', '编辑商品', 'ACTION'),
  (1031, 'products:delete', '删除商品', 'ACTION'),
  (1032, 'products:import', '导入商品', 'ACTION'),
  (1033, 'products:export', '导出商品', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 证照管理
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1034, 'licenses:create', '创建证照', 'ACTION'),
  (1035, 'licenses:edit', '编辑证照', 'ACTION'),
  (1036, 'licenses:delete', '删除证照', 'ACTION'),
  (1037, 'licenses:upload', '上传证照', 'ACTION'),
  (1038, 'licenses:view', '查看证照', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 库存管理
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1039, 'inventory:view', '查看库存', 'ACTION'),
  (1040, 'inventory:viewDetail', '查看批次明细', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 结算管理
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1041, 'settlements:view', '查看结算', 'ACTION'),
  (1042, 'settlements:create', '创建结算', 'ACTION'),
  (1043, 'settlements:confirm', '确认结算', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 发票管理
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1044, 'invoices:create', '创建发票', 'ACTION'),
  (1045, 'invoices:edit', '编辑发票', 'ACTION'),
  (1046, 'invoices:delete', '删除发票', 'ACTION'),
  (1047, 'invoices:view', '查看发票', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 用户管理
INSERT INTO sys_permission (id, permission_code, permission_name, resource_type) VALUES
  (1048, 'users:create', '创建用户', 'ACTION'),
  (1049, 'users:edit', '编辑用户', 'ACTION'),
  (1050, 'users:delete', '删除用户', 'ACTION'),
  (1051, 'users:resetPassword', '重置密码', 'ACTION'),
  (1052, 'users:assignRole', '分配角色', 'ACTION')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), resource_type = VALUES(resource_type);

-- 为 admin 角色分配所有新权限
INSERT IGNORE INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM sys_role r
JOIN sys_permission p ON p.permission_code IN (
  'hospitals:create', 'hospitals:edit', 'hospitals:delete', 'hospitals:assignSupplier',
  'suppliers:create', 'suppliers:edit', 'suppliers:delete', 'suppliers:assignHospital',
  'products:create', 'products:edit', 'products:delete', 'products:import', 'products:export',
  'licenses:create', 'licenses:edit', 'licenses:delete', 'licenses:upload', 'licenses:view',
  'inventory:view', 'inventory:viewDetail',
  'settlements:view', 'settlements:create', 'settlements:confirm',
  'invoices:create', 'invoices:edit', 'invoices:delete', 'invoices:view',
  'users:create', 'users:edit', 'users:delete', 'users:resetPassword', 'users:assignRole'
)
WHERE r.tenant_id = 1 AND r.role_code = 'admin' AND r.deleted = 0;

-- 更新 id 序列
UPDATE sys_id_sequence SET next_id = GREATEST(next_id, 1053) WHERE table_name = 'sys_permission';
