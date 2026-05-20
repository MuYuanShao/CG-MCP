ALTER TABLE biz_license
  ADD COLUMN license_name VARCHAR(255) NULL AFTER license_type,
  ADD COLUMN hospital_name VARCHAR(255) NULL AFTER license_name,
  ADD COLUMN related_product VARCHAR(500) NULL AFTER product_id;

INSERT INTO sys_id_sequence (table_name, next_id)
SELECT 'biz_license', COALESCE(MAX(id), 0) + 1 FROM biz_license
ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id));
