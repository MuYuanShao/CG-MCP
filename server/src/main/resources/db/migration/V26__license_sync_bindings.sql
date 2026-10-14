CREATE TABLE spd_license_binding (
  tenant_id BIGINT NOT NULL,
  instance_id VARCHAR(36) NOT NULL,
  license_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  source_updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY(tenant_id,instance_id,license_id,product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已确认的来源证照商品关联，用于变更后清理旧关联';

UPDATE biz_license l JOIN (
  SELECT tenant_id,product_name,MIN(id) AS product_id FROM biz_product WHERE deleted=0 GROUP BY tenant_id,product_name HAVING COUNT(*)=1
) p ON p.tenant_id=l.tenant_id AND p.product_name=l.related_product SET l.product_id=p.product_id WHERE l.product_id IS NULL;
