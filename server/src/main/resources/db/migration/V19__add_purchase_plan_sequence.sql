-- 为采购计划表添加 ID 序列
INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_purchase_plan', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_purchase_plan) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_purchase_plan';
