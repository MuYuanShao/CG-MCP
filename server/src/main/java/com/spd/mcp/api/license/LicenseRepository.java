package com.spd.mcp.api.license;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LicenseRepository {
  private final JdbcTemplate jdbcTemplate;

  public LicenseRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<LicenseDto> search(long tenantId, LicenseSearchRequest request) {
    if (request == null || !request.hasAnyCondition()) {
      return List.of();
    }

    List<LicenseDto> result = new ArrayList<>();
    if (matchesType(request.licenseType(), "注册证")) {
      result.addAll(searchRegistrationLicenses(tenantId, request));
    }
    if (matchesType(request.licenseType(), "合同")) {
      result.addAll(searchContractLicenses(tenantId, request));
    }
    result.addAll(searchStoredLicenses(tenantId, request));
    return result;
  }

  private List<LicenseDto> searchRegistrationLicenses(long tenantId, LicenseSearchRequest request) {
    List<Object> params = new ArrayList<>();
    StringBuilder sql = new StringBuilder("""
        SELECT
          -pr.id AS id,
          pr.registration_no AS license_code,
          CONCAT(pr.product_name, '注册证') AS license_name,
          '注册证' AS license_type,
          pr.product_name AS related_product,
          COALESCE(h.hospital_name, '') AS hospital_name,
          NULL AS issue_date,
          DATE_ADD(CURRENT_DATE, INTERVAL 2 YEAR) AS expiry_date,
          NULL AS file_url,
          '' AS remark,
          pr.status AS status
        FROM biz_product pr
        LEFT JOIN biz_purchase_plan pp ON pp.product_id = pr.id AND pp.tenant_id = pr.tenant_id AND pp.deleted = 0
        LEFT JOIN biz_hospital h ON h.id = pp.hospital_id AND h.tenant_id = pp.tenant_id
        WHERE pr.tenant_id = ? AND pr.deleted = 0 AND COALESCE(pr.registration_no, '') <> ''
        """);
    params.add(tenantId);
    appendLike(sql, params, "pr.product_name", request.productName());
    appendLike(sql, params, "pr.manufacturer", request.manufacturer());
    appendLike(sql, params, "pr.registration_no", request.registrationNo());
    appendLike(sql, params, "pr.registration_no", request.licenseCode());
    sql.append(" ORDER BY pr.updated_time DESC LIMIT 100");
    return jdbcTemplate.query(sql.toString(), this::mapLicense, params.toArray());
  }

  private List<LicenseDto> searchContractLicenses(long tenantId, LicenseSearchRequest request) {
    List<Object> params = new ArrayList<>();
    StringBuilder sql = new StringBuilder("""
        SELECT
          -100000 - pr.id AS id,
          pr.hospital_contract_code AS license_code,
          CONCAT(pr.product_name, '院内合同') AS license_name,
          '合同' AS license_type,
          pr.product_name AS related_product,
          COALESCE(h.hospital_name, '') AS hospital_name,
          NULL AS issue_date,
          DATE_ADD(CURRENT_DATE, INTERVAL 1 YEAR) AS expiry_date,
          NULL AS file_url,
          '' AS remark,
          pr.status AS status
        FROM biz_product pr
        LEFT JOIN biz_purchase_plan pp ON pp.product_id = pr.id AND pp.tenant_id = pr.tenant_id AND pp.deleted = 0
        LEFT JOIN biz_hospital h ON h.id = pp.hospital_id AND h.tenant_id = pp.tenant_id
        WHERE pr.tenant_id = ? AND pr.deleted = 0 AND COALESCE(pr.hospital_contract_code, '') <> ''
        """);
    params.add(tenantId);
    appendLike(sql, params, "pr.product_name", request.productName());
    appendLike(sql, params, "pr.manufacturer", request.manufacturer());
    appendLike(sql, params, "pr.registration_no", request.registrationNo());
    appendLike(sql, params, "pr.hospital_contract_code", request.contractCode());
    appendLike(sql, params, "pr.hospital_contract_code", request.licenseCode());
    sql.append(" ORDER BY pr.updated_time DESC LIMIT 100");
    return jdbcTemplate.query(sql.toString(), this::mapLicense, params.toArray());
  }

  private List<LicenseDto> searchStoredLicenses(long tenantId, LicenseSearchRequest request) {
    List<Object> params = new ArrayList<>();
    StringBuilder sql = new StringBuilder("""
        SELECT
          l.id,
          l.license_code,
          COALESCE(l.license_name, CONCAT(COALESCE(pr.product_name, COALESCE(h.hospital_name, '')), l.license_type)) AS license_name,
          l.license_type,
          COALESCE(pr.product_name, l.related_product, '-') AS related_product,
          COALESCE(l.hospital_name, h.hospital_name, '') AS hospital_name,
          l.issue_date,
          l.expiry_date,
          l.file_url,
          COALESCE(l.remark, '') AS remark,
          l.status
        FROM biz_license l
        LEFT JOIN biz_product pr ON pr.id = l.product_id AND pr.tenant_id = l.tenant_id
        LEFT JOIN biz_hospital h ON h.id = l.hospital_id AND h.tenant_id = l.tenant_id
        WHERE l.tenant_id = ? AND l.deleted = 0
        """);
    params.add(tenantId);
    appendEquals(sql, params, "l.license_type", request.licenseType());
    appendLike(sql, params, "pr.product_name", request.productName());
    appendLike(sql, params, "pr.manufacturer", request.manufacturer());
    appendLike(sql, params, "pr.registration_no", request.registrationNo());
    appendLike(sql, params, "pr.hospital_contract_code", request.contractCode());
    appendLike(sql, params, "l.license_code", request.licenseCode());
    sql.append(" ORDER BY l.updated_time DESC LIMIT 100");
    return jdbcTemplate.query(sql.toString(), this::mapLicense, params.toArray());
  }

  public Optional<LicenseDto> findById(long tenantId, long id) {
    String sql = """
        SELECT
          l.id,
          l.license_code,
          COALESCE(l.license_name, CONCAT(COALESCE(pr.product_name, COALESCE(h.hospital_name, '')), l.license_type)) AS license_name,
          l.license_type,
          COALESCE(pr.product_name, l.related_product, '-') AS related_product,
          COALESCE(l.hospital_name, h.hospital_name, '') AS hospital_name,
          l.issue_date,
          l.expiry_date,
          l.file_url,
          COALESCE(l.remark, '') AS remark,
          l.status
        FROM biz_license l
        LEFT JOIN biz_product pr ON pr.id = l.product_id AND pr.tenant_id = l.tenant_id
        LEFT JOIN biz_hospital h ON h.id = l.hospital_id AND h.tenant_id = l.tenant_id
        WHERE l.tenant_id = ? AND l.id = ? AND l.deleted = 0
        """;
    return jdbcTemplate.query(sql, this::mapLicense, tenantId, id).stream().findFirst();
  }

  public void insert(long tenantId, long id, LicenseRequest request) {
    jdbcTemplate.update("""
        INSERT INTO biz_license (
          id, tenant_id, license_code, license_type, license_name, hospital_name,
          related_product, issue_date, expiry_date, file_url, status, remark,product_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?,?)
        """,
        id,
        tenantId,
        valueOrGeneratedCode(request.licenseCode(), id),
        request.licenseType(),
        request.licenseName(),
        request.hospitalName(),
        blankToNull(request.relatedProduct()),
        request.issueDate(),
        request.expiryDate(),
        blankToNull(request.fileUrl()),
        blankToNull(request.remark()),resolveProduct(tenantId,id,request));
  }

  public int update(long tenantId, long id, LicenseRequest request) {
    return jdbcTemplate.update("""
        UPDATE biz_license
        SET license_code = ?, license_type = ?, license_name = ?, hospital_name = ?,
          related_product = ?, issue_date = ?, expiry_date = ?, file_url = ?,
          remark = ?,product_id=?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """,
        valueOrGeneratedCode(request.licenseCode(), id),
        request.licenseType(),
        request.licenseName(),
        request.hospitalName(),
        blankToNull(request.relatedProduct()),
        request.issueDate(),
        request.expiryDate(),
        blankToNull(request.fileUrl()),
        blankToNull(request.remark()),
        resolveProduct(tenantId,id,request),
        tenantId,
        id);
  }

  public int delete(long tenantId, long id) {
    return jdbcTemplate.update("""
        UPDATE biz_license
        SET deleted = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, tenantId, id);
  }

  private Long resolveProduct(long tenant,long license,LicenseRequest request) {
    if(request.productId()!=null) {
      var found=jdbcTemplate.queryForList("SELECT id FROM biz_product WHERE tenant_id=? AND id=? AND deleted=0",Long.class,tenant,request.productId());
      if(found.isEmpty()) throw new com.spd.mcp.api.common.BusinessException("LICENSE_PRODUCT_INVALID","关联商品不存在");
      return request.productId();
    }
    if(request.relatedProduct()==null || request.relatedProduct().isBlank() || request.relatedProduct().equals("-")) return null;
    var found=jdbcTemplate.queryForList("SELECT id FROM biz_product WHERE tenant_id=? AND product_name=? AND deleted=0",Long.class,tenant,request.relatedProduct());
    if(found.size()>1) throw new com.spd.mcp.api.common.BusinessException("LICENSE_PRODUCT_AMBIGUOUS","关联商品名称不唯一，请使用商品ID关联");
    if(!found.isEmpty()) return found.get(0);
    var previous=jdbcTemplate.queryForList("SELECT product_id,related_product FROM biz_license WHERE tenant_id=? AND id=?",tenant,license);
    if(!previous.isEmpty() && request.relatedProduct().equals(previous.get(0).get("related_product")) && previous.get(0).get("product_id") instanceof Number id) return id.longValue();
    return null;
  }

  private LicenseDto mapLicense(ResultSet rs, int rowNum) throws SQLException {
    Date issueDate = rs.getDate("issue_date");
    Date expiryDate = rs.getDate("expiry_date");
    LocalDate expiry = expiryDate == null ? null : expiryDate.toLocalDate();
    return new LicenseDto(
        rs.getLong("id"),
        rs.getString("license_code"),
        rs.getString("license_name"),
        rs.getString("license_type"),
        rs.getString("related_product"),
        rs.getString("hospital_name"),
        issueDate == null ? null : issueDate.toLocalDate(),
        expiry,
        expiryStatus(expiry),
        statusText(rs.getInt("status"), expiry),
        rs.getString("file_url"),
        rs.getString("remark"));
  }

  private static void appendLike(StringBuilder sql, List<Object> params, String column, String value) {
    if (value == null || value.isBlank()) return;
    sql.append(" AND ").append(column).append(" LIKE ?");
    params.add("%" + value.trim() + "%");
  }

  private static void appendEquals(StringBuilder sql, List<Object> params, String column, String value) {
    if (value == null || value.isBlank()) return;
    sql.append(" AND ").append(column).append(" = ?");
    params.add(value.trim());
  }

  private static boolean matchesType(String selectedType, String targetType) {
    return selectedType == null || selectedType.isBlank() || targetType.equals(selectedType);
  }

  private static String expiryStatus(LocalDate expiryDate) {
    if (expiryDate == null) return "normal";
    long days = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
    if (days < 0) return "expired";
    if (days <= 30) return "critical";
    if (days <= 60) return "urgent";
    if (days <= 90) return "warning";
    return "normal";
  }

  private static String statusText(int status, LocalDate expiryDate) {
    if ("expired".equals(expiryStatus(expiryDate))) return "expired";
    return switch (status) {
      case 0 -> "pending";
      case 2 -> "rejected";
      case 3 -> "expired";
      default -> "active";
    };
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private static String valueOrGeneratedCode(String value, long id) {
    return value == null || value.isBlank() ? "ZZ" + id : value.trim();
  }
}
