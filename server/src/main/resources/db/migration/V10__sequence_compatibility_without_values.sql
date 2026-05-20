INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_hospital', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_hospital) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_hospital';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_supplier', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_supplier) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_supplier';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_product', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_product) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_product';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_refund', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_refund) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_refund';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_purchase_order', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_purchase_order) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_purchase_order';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_delivery_order', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_delivery_order) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_delivery_order';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_delivery_order_item', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_delivery_order_item) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_delivery_order_item';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_shipment_order', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_shipment_order) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_shipment_order';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('sys_user', 1002);
UPDATE sys_id_sequence s
JOIN (SELECT GREATEST(COALESCE(MAX(id), 0) + 1, 1002) AS next_id FROM sys_user) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'sys_user';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('sys_role', 1002);
UPDATE sys_id_sequence s
JOIN (SELECT GREATEST(COALESCE(MAX(id), 0) + 1, 1002) AS next_id FROM sys_role) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'sys_role';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('sys_permission', 1021);
UPDATE sys_id_sequence s
JOIN (SELECT GREATEST(COALESCE(MAX(id), 0) + 1, 1021) AS next_id FROM sys_permission) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'sys_permission';

INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('sys_user_session', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM sys_user_session) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'sys_user_session';
