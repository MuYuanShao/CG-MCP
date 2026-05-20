DELIMITER $$
DROP PROCEDURE IF EXISTS add_purchase_demo_columns$$
CREATE PROCEDURE add_purchase_demo_columns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_hospital' AND COLUMN_NAME = 'cooperation_date'
  ) THEN
    ALTER TABLE biz_hospital ADD COLUMN cooperation_date DATE NULL AFTER status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'category'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN category VARCHAR(80) NULL AFTER product_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'spec'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN spec VARCHAR(100) NULL AFTER category;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'model'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN model VARCHAR(100) NULL AFTER spec;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'unit'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN unit VARCHAR(20) NULL AFTER model;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'manufacturer'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN manufacturer VARCHAR(200) NULL AFTER unit;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'registration_no'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN registration_no VARCHAR(100) NULL AFTER manufacturer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'udi_code'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN udi_code VARCHAR(200) NULL AFTER registration_no;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_product' AND COLUMN_NAME = 'price'
  ) THEN
    ALTER TABLE biz_product ADD COLUMN price DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER udi_code;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_purchase_plan' AND COLUMN_NAME = 'unit_price'
  ) THEN
    ALTER TABLE biz_purchase_plan ADD COLUMN unit_price DECIMAL(12,4) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_purchase_plan' AND COLUMN_NAME = 'plan_qty'
  ) THEN
    ALTER TABLE biz_purchase_plan ADD COLUMN plan_qty INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_purchase_plan' AND COLUMN_NAME = 'expected_delivery_date'
  ) THEN
    ALTER TABLE biz_purchase_plan ADD COLUMN expected_delivery_date DATE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_purchase_plan' AND COLUMN_NAME = 'plan_no'
  ) THEN
    ALTER TABLE biz_purchase_plan ADD COLUMN plan_no VARCHAR(50) NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_purchase_plan' AND COLUMN_NAME = 'hospital_id'
  ) THEN
    ALTER TABLE biz_purchase_plan ADD COLUMN hospital_id BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_purchase_plan' AND COLUMN_NAME = 'product_id'
  ) THEN
    ALTER TABLE biz_purchase_plan ADD COLUMN product_id BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_purchase_plan' AND COLUMN_NAME = 'status'
  ) THEN
    ALTER TABLE biz_purchase_plan ADD COLUMN status TINYINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_purchase_plan' AND COLUMN_NAME = 'deleted'
  ) THEN
    ALTER TABLE biz_purchase_plan ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0;
  END IF;
END$$
DELIMITER ;

CALL add_purchase_demo_columns();
DROP PROCEDURE add_purchase_demo_columns;

INSERT INTO biz_hospital (
  id, tenant_id, hospital_code, hospital_name, hospital_level, city,
  contact_name, contact_phone, cooperation_date, status, deleted
) VALUES (
  9001, 1, 'H-DEMO-9001', '采购演示医院', '三级甲等', '杭州市',
  '采购联系人', '0571-90019001', CURRENT_DATE, 1, 0
) ON DUPLICATE KEY UPDATE
  hospital_name = VALUES(hospital_name),
  deleted = 0,
  status = 1;

INSERT INTO biz_product (
  id, tenant_id, product_code, product_name, category, spec, model, unit,
  manufacturer, registration_no, udi_code, price, status, deleted
) VALUES (
  9001, 1, 'P-DEMO-9001', '采购配送演示商品', '低值耗材', '10只/盒', 'KZ-DEMO',
  '盒', '演示生产厂家', 'ZC-DEMO-9001', 'UDI-DEMO-9001', 35.0000, 1, 0
) ON DUPLICATE KEY UPDATE
  product_name = VALUES(product_name),
  deleted = 0,
  status = 1;

INSERT INTO biz_purchase_plan (
  id, tenant_id, plan_no, hospital_id, product_id, plan_qty, unit_price,
  expected_delivery_date, status, deleted
) VALUES (
  9001, 1, 'PP-DEMO-9001', 9001, 9001, 100, 35.0000, CURRENT_DATE, 3, 0
) ON DUPLICATE KEY UPDATE
  hospital_id = VALUES(hospital_id),
  product_id = VALUES(product_id),
  plan_qty = VALUES(plan_qty),
  unit_price = VALUES(unit_price),
  status = VALUES(status),
  deleted = 0;
