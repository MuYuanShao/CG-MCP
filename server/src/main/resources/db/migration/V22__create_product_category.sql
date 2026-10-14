CREATE TABLE biz_product_category (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  category_name VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  deleted TINYINT NOT NULL DEFAULT 0,
  created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商品分类';

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_product_category', COALESCE(MAX(id), 0) + 1 FROM biz_product_category
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));
