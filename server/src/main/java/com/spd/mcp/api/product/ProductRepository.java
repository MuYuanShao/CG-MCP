package com.spd.mcp.api.product;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProductRepository {
  private final JdbcTemplate jdbcTemplate;

  public ProductRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<ProductDto> findAll(long tenantId) {
    return jdbcTemplate.query("""
        SELECT id, product_code, product_name, category, spec, model, unit,
          manufacturer, registration_no, udi_code, price, medium_package, large_package,
          zc_local_code, hospital_contract_code, brand, distributor, status
        FROM biz_product
        WHERE tenant_id = ? AND deleted = 0
        ORDER BY id ASC
        """, this::mapProduct, tenantId);
  }

  public Optional<ProductDto> findById(long tenantId, long id) {
    return jdbcTemplate.query("""
        SELECT id, product_code, product_name, category, spec, model, unit,
          manufacturer, registration_no, udi_code, price, medium_package, large_package,
          zc_local_code, hospital_contract_code, brand, distributor, status
        FROM biz_product
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, this::mapProduct, tenantId, id).stream().findFirst();
  }

  public void insert(long tenantId, long id, ProductRequest request) {
    jdbcTemplate.update("""
        INSERT INTO biz_product (
          id, tenant_id, product_code, product_name, category, spec, model,
          unit, manufacturer, registration_no, udi_code, price, medium_package, large_package,
          zc_local_code, hospital_contract_code, brand, distributor, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        id,
        tenantId,
        resolveCode(request.code(), id),
        request.name(),
        request.category(),
        request.spec(),
        request.model(),
        request.unit(),
        request.manufacturer(),
        request.registrationNo(),
        request.udi(),
        resolvePrice(request.unitPrice()),
        resolvePackage(request.mediumPackage()),
        resolvePackage(request.largePackage()),
        request.zcLocalCode(),
        request.hospitalContractCode(),
        request.brand(),
        request.distributor(),
        toDbStatus(request.status()));
  }

  public int update(long tenantId, long id, ProductRequest request) {
    return jdbcTemplate.update("""
        UPDATE biz_product
        SET product_code = ?, product_name = ?, category = ?, spec = ?, model = ?,
          unit = ?, manufacturer = ?, registration_no = ?, udi_code = ?,
          price = ?, medium_package = ?, large_package = ?,
          zc_local_code = ?, hospital_contract_code = ?, brand = ?, distributor = ?, status = ?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """,
        resolveCode(request.code(), id),
        request.name(),
        request.category(),
        request.spec(),
        request.model(),
        request.unit(),
        request.manufacturer(),
        request.registrationNo(),
        request.udi(),
        resolvePrice(request.unitPrice()),
        resolvePackage(request.mediumPackage()),
        resolvePackage(request.largePackage()),
        request.zcLocalCode(),
        request.hospitalContractCode(),
        request.brand(),
        request.distributor(),
        toDbStatus(request.status()),
        tenantId,
        id);
  }

  public int delete(long tenantId, long id) {
    return jdbcTemplate.update("""
        UPDATE biz_product
        SET deleted = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, tenantId, id);
  }

  private ProductDto mapProduct(ResultSet rs, int rowNum) throws SQLException {
    return new ProductDto(
        rs.getLong("id"),
        rs.getString("product_code"),
        rs.getString("product_name"),
        "",
        rs.getString("spec"),
        rs.getString("model"),
        rs.getBigDecimal("price"),
        rs.getString("unit"),
        rs.getString("registration_no"),
        "",
        rs.getString("udi_code"),
        rs.getString("category"),
        rs.getString("manufacturer"),
        rs.getString("distributor"),
        rs.getString("brand"),
        1,
        0,
        "",
        rs.getString("zc_local_code"),
        rs.getInt("medium_package"),
        rs.getInt("large_package"),
        rs.getString("hospital_contract_code"),
        rs.getInt("status") == 1 ? "active" : "inactive");
  }

  private String resolveCode(String code, long id) {
    if (code != null && !code.isBlank()) return code;
    return "YLQX" + String.format("%08d", id);
  }

  private BigDecimal resolvePrice(BigDecimal price) {
    return price == null ? BigDecimal.ZERO : price;
  }

  private int resolvePackage(Integer packageSize) {
    return packageSize == null ? 0 : packageSize;
  }

  private int toDbStatus(String status) {
    return "inactive".equals(status) ? 0 : 1;
  }
}
