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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='前端操作落库日志';
