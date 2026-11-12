CREATE TABLE spd_supply_draft (
  draft_id CHAR(36) PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  instance_id CHAR(36) NOT NULL,
  order_no VARCHAR(100) NOT NULL,
  supplier_code VARCHAR(100) NOT NULL,
  user_id BIGINT NOT NULL,
  payload JSON NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uk_spd_draft_owner (tenant_id,user_id,instance_id,order_no,supplier_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
