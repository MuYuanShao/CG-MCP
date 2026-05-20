CREATE TABLE IF NOT EXISTS biz_supplier_hospital (
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  hospital_id BIGINT NOT NULL,
  created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, supplier_id, hospital_id),
  KEY idx_supplier_hospital_hospital (tenant_id, hospital_id),
  KEY idx_supplier_hospital_supplier (tenant_id, supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商医院授权关系';
