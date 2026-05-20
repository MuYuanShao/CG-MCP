CREATE TABLE IF NOT EXISTS biz_delivery_order (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  delivery_no VARCHAR(50) NOT NULL,
  order_id BIGINT NOT NULL,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待发货 1拣货中 2已发货 3物流异常 4已到货 5已撤回',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_delivery_tenant_no (tenant_id, delivery_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='配送单';

DELIMITER $$
CREATE PROCEDURE add_delivery_edit_columns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_delivery_order' AND COLUMN_NAME = 'delivery_date'
  ) THEN
    ALTER TABLE biz_delivery_order ADD COLUMN delivery_date DATE NULL AFTER order_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_delivery_order' AND COLUMN_NAME = 'remark'
  ) THEN
    ALTER TABLE biz_delivery_order ADD COLUMN remark VARCHAR(500) NULL AFTER status;
  END IF;
END$$
DELIMITER ;

CALL add_delivery_edit_columns();
DROP PROCEDURE add_delivery_edit_columns;

CREATE TABLE IF NOT EXISTS biz_delivery_order_item (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  delivery_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  plan_qty INT NOT NULL DEFAULT 0,
  delivered_qty INT NOT NULL DEFAULT 0,
  production_date DATE NULL,
  expiry_date DATE NULL,
  batch_no VARCHAR(50),
  remark VARCHAR(500),
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_delivery_item_product (tenant_id, delivery_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='配送单明细';
