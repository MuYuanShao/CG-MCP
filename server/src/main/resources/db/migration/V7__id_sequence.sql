CREATE TABLE IF NOT EXISTS sys_id_sequence (
  table_name VARCHAR(100) PRIMARY KEY,
  next_id BIGINT NOT NULL,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='业务表 ID 序列';

CREATE TABLE IF NOT EXISTS biz_shipment_order (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  shipment_no VARCHAR(50) NOT NULL,
  delivery_id BIGINT NOT NULL,
  carrier VARCHAR(100),
  batch_no VARCHAR(50),
  ship_date DATE,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待出库 1已出库 2运输中 3已签收 4签收异常',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_shipment_tenant_no (tenant_id, shipment_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='发货单';

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_hospital', COALESCE(MAX(id), 0) + 1 FROM biz_hospital
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_supplier', COALESCE(MAX(id), 0) + 1 FROM biz_supplier
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_product', COALESCE(MAX(id), 0) + 1 FROM biz_product
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_refund', COALESCE(MAX(id), 0) + 1 FROM biz_refund
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_purchase_order', COALESCE(MAX(id), 0) + 1 FROM biz_purchase_order
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_delivery_order', COALESCE(MAX(id), 0) + 1 FROM biz_delivery_order
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_delivery_order_item', COALESCE(MAX(id), 0) + 1 FROM biz_delivery_order_item
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_shipment_order', COALESCE(MAX(id), 0) + 1 FROM biz_shipment_order
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));
