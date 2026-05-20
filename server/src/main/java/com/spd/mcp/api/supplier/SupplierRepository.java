package com.spd.mcp.api.supplier;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SupplierRepository {
  private final JdbcTemplate jdbcTemplate;

  public SupplierRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<SupplierDto> findAll(long tenantId) {
    return jdbcTemplate.query("""
        SELECT id, supplier_code, supplier_name, category, city, contact_name,
          contact_phone, status, DATE(created_time) AS cooperation_date
        FROM biz_supplier
        WHERE tenant_id = ? AND deleted = 0
        ORDER BY id ASC
        """, this::mapSupplier, tenantId);
  }

  public Optional<SupplierDto> findById(long tenantId, long id) {
    return jdbcTemplate.query("""
        SELECT id, supplier_code, supplier_name, category, city, contact_name,
          contact_phone, status, DATE(created_time) AS cooperation_date
        FROM biz_supplier
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, this::mapSupplier, tenantId, id).stream().findFirst();
  }

  public void insert(long tenantId, long id, SupplierRequest request) {
    jdbcTemplate.update("""
        INSERT INTO biz_supplier (
          id, tenant_id, supplier_code, supplier_name, category, city,
          contact_name, contact_phone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        id,
        tenantId,
        request.code(),
        request.name(),
        request.category(),
        request.city(),
        request.contact(),
        request.phone(),
        toDbStatus(request.status()));
  }

  public int update(long tenantId, long id, SupplierRequest request) {
    return jdbcTemplate.update("""
        UPDATE biz_supplier
        SET supplier_code = ?, supplier_name = ?, category = ?, city = ?,
          contact_name = ?, contact_phone = ?, status = ?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """,
        request.code(),
        request.name(),
        request.category(),
        request.city(),
        request.contact(),
        request.phone(),
        toDbStatus(request.status()),
        tenantId,
        id);
  }

  public int delete(long tenantId, long id) {
    return jdbcTemplate.update("""
        UPDATE biz_supplier
        SET deleted = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, tenantId, id);
  }

  private SupplierDto mapSupplier(ResultSet rs, int rowNum) throws SQLException {
    java.sql.Date cooperationDate = rs.getDate("cooperation_date");
    return new SupplierDto(
        rs.getLong("id"),
        rs.getString("supplier_code"),
        rs.getString("supplier_name"),
        rs.getString("category"),
        rs.getString("city"),
        rs.getString("contact_name"),
        rs.getString("contact_phone"),
        rs.getInt("status") == 1 ? "active" : "inactive",
        cooperationDate == null ? null : cooperationDate.toLocalDate());
  }

  private int toDbStatus(String status) {
    return "inactive".equals(status) ? 0 : 1;
  }
}
