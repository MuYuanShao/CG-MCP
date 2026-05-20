package com.spd.mcp.api.inventory;

import com.spd.mcp.api.common.PageResult;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InventoryRepository {
  private final JdbcTemplate jdbcTemplate;

  public InventoryRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<InventoryLedgerDto> ledger(long tenantId) {
    return jdbcTemplate.query("""
        SELECT
          MIN(b.id) AS id,
          p.id AS product_id,
          p.product_code,
          p.product_name,
          p.spec,
          COALESCE(SUM(b.total_qty), 0) AS total_qty,
          COALESCE(SUM(b.available_qty), 0) AS available_qty,
          COALESCE(SUM(b.locked_qty), 0) AS locked_qty,
          COALESCE(MAX(b.expire_status), 0) AS expire_status
        FROM biz_inventory_batch b
        JOIN biz_product p ON p.id = b.product_id AND p.tenant_id = b.tenant_id
        WHERE b.tenant_id = ? AND b.deleted = 0 AND p.deleted = 0
        GROUP BY p.id, p.product_code, p.product_name, p.spec
        ORDER BY p.product_code ASC
        LIMIT 200
        """, (rs, rowNum) -> {
          int totalQty = rs.getInt("total_qty");
          int availableQty = rs.getInt("available_qty");
          return new InventoryLedgerDto(
              rs.getLong("id"),
              rs.getLong("product_id"),
              rs.getString("product_code"),
              rs.getString("product_name"),
              rs.getString("spec"),
              "中心仓库",
              "-",
              totalQty,
              availableQty,
              rs.getInt("locked_qty"),
              toExpiryStatus(rs.getInt("expire_status")),
              totalQty <= 0 ? "out" : availableQty <= 0 ? "low" : "normal");
        }, tenantId);
  }

  public PageResult<InventoryBatchDetailDto> batchDetails(
      long tenantId,
      long productId,
      long current,
      long size
  ) {
    Long total = jdbcTemplate.queryForObject("""
        SELECT COUNT(*)
        FROM biz_inventory_batch b
        WHERE b.tenant_id = ? AND b.product_id = ? AND b.deleted = 0
        """, Long.class, tenantId, productId);
    long offset = (current - 1) * size;
    List<Object> params = new ArrayList<>();
    params.add(tenantId);
    params.add(productId);
    params.add(size);
    params.add(offset);
    List<InventoryBatchDetailDto> records = jdbcTemplate.query("""
        SELECT
          b.id,
          p.product_name,
          p.spec,
          p.model,
          b.batch_no,
          b.expire_date,
          b.total_qty
        FROM biz_inventory_batch b
        JOIN biz_product p ON p.id = b.product_id AND p.tenant_id = b.tenant_id
        WHERE b.tenant_id = ? AND b.product_id = ? AND b.deleted = 0 AND p.deleted = 0
        ORDER BY b.expire_date ASC, b.id ASC
        LIMIT ? OFFSET ?
        """, (rs, rowNum) -> {
          Date expiryDate = rs.getDate("expire_date");
          return new InventoryBatchDetailDto(
              rs.getLong("id"),
              rs.getString("product_name"),
              rs.getString("spec"),
              rs.getString("model"),
              rs.getString("batch_no"),
              expiryDate == null ? null : expiryDate.toLocalDate(),
              rs.getInt("total_qty"));
        }, params.toArray());
    return new PageResult<>(records, total == null ? 0 : total, current, size);
  }

  private String toExpiryStatus(int status) {
    return switch (status) {
      case 1 -> "warning";
      case 2 -> "urgent";
      case 3 -> "critical";
      case 4 -> "expired";
      default -> "normal";
    };
  }
}
