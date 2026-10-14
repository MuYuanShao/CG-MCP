-- 移除配送单(deliveryOrders)和运输单(shipmentOrders)权限
-- 采购流程简化：SPD 计划 → 供应商确认转订单 → 填写批号/日期/数量/UDI

DELETE FROM sys_role_permission
WHERE permission_id IN (
  SELECT id FROM sys_permission
  WHERE permission_code LIKE 'deliveryOrders:%' OR permission_code LIKE 'shipmentOrders:%'
);

DELETE FROM sys_permission
WHERE permission_code LIKE 'deliveryOrders:%' OR permission_code LIKE 'shipmentOrders:%';

UPDATE sys_id_sequence SET next_id = (SELECT COALESCE(MAX(id), 0) + 1 FROM sys_permission) WHERE table_name = 'sys_permission';
