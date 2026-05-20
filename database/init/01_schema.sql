CREATE DATABASE IF NOT EXISTS `spd-mcp`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `spd-mcp`;

CREATE TABLE IF NOT EXISTS sys_tenant (
  id BIGINT PRIMARY KEY,
  tenant_code VARCHAR(50) NOT NULL UNIQUE,
  tenant_name VARCHAR(200) NOT NULL,
  credit_code VARCHAR(50),
  contact_name VARCHAR(50),
  contact_phone VARCHAR(20),
  status TINYINT NOT NULL DEFAULT 1,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB COMMENT='供应商租户';

CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  username VARCHAR(50) NOT NULL,
  real_name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(120),
  dept_name VARCHAR(100),
  status TINYINT NOT NULL DEFAULT 1,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_user_tenant_username (tenant_id, username),
  KEY idx_user_tenant (tenant_id)
) ENGINE=InnoDB COMMENT='用户';

CREATE TABLE IF NOT EXISTS sys_role (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  data_scope VARCHAR(20) NOT NULL DEFAULT 'DATA_SCOPE_TENANT',
  status TINYINT NOT NULL DEFAULT 1,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_role_tenant_code (tenant_id, role_code)
) ENGINE=InnoDB COMMENT='角色';

CREATE TABLE IF NOT EXISTS biz_hospital (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  hospital_code VARCHAR(50) NOT NULL,
  hospital_name VARCHAR(200) NOT NULL,
  hospital_level VARCHAR(50),
  city VARCHAR(80),
  contact_name VARCHAR(50),
  contact_phone VARCHAR(20),
  status TINYINT NOT NULL DEFAULT 1,
  cooperation_date DATE,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_hospital_tenant_code (tenant_id, hospital_code),
  KEY idx_hospital_tenant (tenant_id)
) ENGINE=InnoDB COMMENT='医院';

CREATE TABLE IF NOT EXISTS biz_supplier (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  supplier_code VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  city VARCHAR(80),
  contact_name VARCHAR(50),
  contact_phone VARCHAR(20),
  status TINYINT NOT NULL DEFAULT 1,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_supplier_tenant_code (tenant_id, supplier_code)
) ENGINE=InnoDB COMMENT='供应商';

CREATE TABLE IF NOT EXISTS biz_product (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  spec VARCHAR(100),
  model VARCHAR(100),
  unit VARCHAR(20),
  manufacturer VARCHAR(200),
  registration_no VARCHAR(100),
  udi_code VARCHAR(200),
  price DECIMAL(12,4) NOT NULL DEFAULT 0,
  hospital_contract_code VARCHAR(100),
  status TINYINT NOT NULL DEFAULT 1,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_product_tenant_code (tenant_id, product_code),
  KEY idx_product_tenant_name (tenant_id, product_name)
) ENGINE=InnoDB COMMENT='商品目录';

CREATE TABLE IF NOT EXISTS biz_license (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  license_code VARCHAR(80) NOT NULL,
  license_type VARCHAR(80) NOT NULL,
  hospital_id BIGINT,
  product_id BIGINT,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  file_url VARCHAR(500),
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1生效 2驳回 3过期',
  remark VARCHAR(500),
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_license_tenant_code (tenant_id, license_code),
  KEY idx_license_expiry (tenant_id, expiry_date)
) ENGINE=InnoDB COMMENT='证照';

CREATE TABLE IF NOT EXISTS biz_purchase_plan (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  plan_no VARCHAR(50) NOT NULL,
  hospital_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  plan_qty INT NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL DEFAULT 0,
  expected_delivery_date DATE,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0草稿 1待审批 2驳回 3待转订单 4部分转订单 5已转订单 6关闭',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_plan_tenant_no (tenant_id, plan_no)
) ENGINE=InnoDB COMMENT='采购计划';

CREATE TABLE IF NOT EXISTS biz_purchase_order (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  order_no VARCHAR(50) NOT NULL,
  plan_id BIGINT,
  hospital_id BIGINT NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  order_date DATE NOT NULL,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待确认 1已确认 2部分发货 3已发货 4已到货 5已验收 6已完成 7已关闭',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_order_tenant_no (tenant_id, order_no)
) ENGINE=InnoDB COMMENT='采购订单';

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
) ENGINE=InnoDB COMMENT='配送单';

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
) ENGINE=InnoDB COMMENT='发货单';

CREATE TABLE IF NOT EXISTS biz_acceptance (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  acceptance_no VARCHAR(50) NOT NULL,
  order_id BIGINT NOT NULL,
  accept_date DATE,
  total_qty INT NOT NULL DEFAULT 0,
  qualified_qty INT NOT NULL DEFAULT 0,
  unqualified_qty INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待验收 1部分验收 2已验收 3有差异',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_acceptance_tenant_no (tenant_id, acceptance_no)
) ENGINE=InnoDB COMMENT='验收单';

CREATE TABLE IF NOT EXISTS biz_refund (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  refund_no VARCHAR(50) NOT NULL,
  order_id BIGINT,
  hospital_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  batch_no VARCHAR(50),
  refund_qty INT NOT NULL,
  refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  refund_reason VARCHAR(500),
  apply_date DATE NOT NULL,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已审核 2退货中 3已完成 4已驳回 5已关闭',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_refund_tenant_no (tenant_id, refund_no),
  KEY idx_refund_status (tenant_id, status)
) ENGINE=InnoDB COMMENT='退货单';

CREATE TABLE IF NOT EXISTS biz_inventory_batch (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  batch_no VARCHAR(50) NOT NULL,
  production_date DATE,
  expire_date DATE,
  total_qty INT NOT NULL DEFAULT 0,
  available_qty INT NOT NULL DEFAULT 0,
  locked_qty INT NOT NULL DEFAULT 0,
  expire_status TINYINT NOT NULL DEFAULT 0 COMMENT '0正常 1近效期 2临近效期 3过期预警 4已过期',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_inventory_batch (tenant_id, product_id, batch_no)
) ENGINE=InnoDB COMMENT='库存批次';

CREATE TABLE IF NOT EXISTS biz_settlement (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  settlement_no VARCHAR(50) NOT NULL,
  hospital_id BIGINT NOT NULL,
  settlement_start DATE,
  settlement_end DATE,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待确认 1供应商已确认 2医院已确认 3已审批 4差异处理中 5已完成 6待开票',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_settlement_tenant_no (tenant_id, settlement_no)
) ENGINE=InnoDB COMMENT='结算单';

CREATE TABLE IF NOT EXISTS biz_invoice (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  invoice_no VARCHAR(50) NOT NULL,
  invoice_code VARCHAR(50),
  settlement_id BIGINT,
  hospital_id BIGINT NOT NULL,
  invoice_date DATE,
  invoice_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  file_url VARCHAR(500),
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已审核 2已签收 3已驳回 4已退回 5已作废',
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_invoice_tenant_no (tenant_id, invoice_no)
) ENGINE=InnoDB COMMENT='发票';

CREATE TABLE IF NOT EXISTS biz_frontend_operation_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  module_code VARCHAR(80) NOT NULL,
  action_code VARCHAR(80) NOT NULL,
  message VARCHAR(500) NOT NULL,
  business_id VARCHAR(80),
  details JSON,
  operator_id BIGINT,
  operator_name VARCHAR(80),
  user_agent VARCHAR(500),
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_frontend_operation_module (tenant_id, module_code, action_code),
  KEY idx_frontend_operation_created_time (created_time)
) ENGINE=InnoDB COMMENT='前端操作落库日志';

CREATE TABLE IF NOT EXISTS biz_supplier_hospital (
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  hospital_id BIGINT NOT NULL,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, supplier_id, hospital_id),
  KEY idx_supplier_hospital_hospital (tenant_id, hospital_id),
  KEY idx_supplier_hospital_supplier (tenant_id, supplier_id)
) ENGINE=InnoDB COMMENT='供应商医院授权关系';

INSERT INTO sys_tenant (id, tenant_code, tenant_name, credit_code, contact_name, contact_phone)
VALUES (1, 'T001', '浙江医疗器械有限公司', '91330000SPD000001', '张经理', '0571-88888888')
ON DUPLICATE KEY UPDATE tenant_name = VALUES(tenant_name);

INSERT INTO biz_hospital (id, tenant_id, hospital_code, hospital_name, hospital_level, city, contact_name, contact_phone, cooperation_date)
VALUES
  (1, 1, 'H001', '浙江省人民医院', '三级甲等', '杭州市', '张主任', '0571-87666666', '2024-01-15'),
  (2, 1, 'H002', '浙江大学医学院附属第一医院', '三级甲等', '杭州市', '李主任', '0571-87236114', '2024-02-20')
ON DUPLICATE KEY UPDATE hospital_name = VALUES(hospital_name);

INSERT INTO biz_product (
  id, tenant_id, product_code, product_name, category, spec, unit, manufacturer,
  registration_no, price, hospital_contract_code
)
VALUES
  (1, 1, 'YLQX20240001', '一次性无菌注射器', '低值耗材', '5ml', '支', '江苏医疗器械有限公司', 'ZC123456', 0.8500, 'HT2024001'),
  (2, 1, 'YLQX20240002', '医用外科口罩', '低值耗材', '一次性', '只', '浙江康健医疗用品公司', 'ZC789012', 0.3500, 'HT2024002')
ON DUPLICATE KEY UPDATE product_name = VALUES(product_name);

INSERT INTO biz_refund (
  id,
  tenant_id,
  refund_no,
  order_id,
  hospital_id,
  product_id,
  batch_no,
  refund_qty,
  refund_amount,
  refund_reason,
  apply_date,
  status
)
VALUES
  (1, 1, 'TH202604180001', NULL, 1, 1, 'B20240215', 120, 102.00, '包装破损', '2026-04-18', 0),
  (2, 1, 'TH202604170003', NULL, 2, 2, 'B20240118', 60, 150.00, '数量差异', '2026-04-17', 1)
ON DUPLICATE KEY UPDATE refund_reason = VALUES(refund_reason);
