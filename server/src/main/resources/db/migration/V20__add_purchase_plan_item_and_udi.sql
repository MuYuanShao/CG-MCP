-- Add biz_purchase_plan_item table (header-detail pattern for purchase plans)
CREATE TABLE IF NOT EXISTS biz_purchase_plan_item (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  plan_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  plan_qty INT NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL DEFAULT 0,
  expected_delivery_date DATE,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_plan_id (plan_id),
  KEY idx_tenant_plan (tenant_id, plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购计划明细';

-- Add udi_code to delivery order item
ALTER TABLE biz_delivery_order_item
  ADD COLUMN udi_code VARCHAR(100) DEFAULT NULL AFTER batch_no;

-- Make product_id nullable on purchase plan (header-only rows)
ALTER TABLE biz_purchase_plan
  MODIFY COLUMN product_id BIGINT NULL;

-- Migrate existing single-product plan data to items
INSERT INTO biz_purchase_plan_item (id, tenant_id, plan_id, product_id, plan_qty, unit_price, expected_delivery_date)
SELECT id, tenant_id, id, product_id, plan_qty, unit_price, expected_delivery_date
FROM biz_purchase_plan
WHERE product_id IS NOT NULL;

-- Add ID sequence for biz_purchase_plan_item
INSERT IGNORE INTO sys_id_sequence (table_name, next_id) VALUES ('biz_purchase_plan_item', 1);
UPDATE sys_id_sequence s
JOIN (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM biz_purchase_plan_item) v
SET s.next_id = GREATEST(s.next_id, v.next_id)
WHERE s.table_name = 'biz_purchase_plan_item';
