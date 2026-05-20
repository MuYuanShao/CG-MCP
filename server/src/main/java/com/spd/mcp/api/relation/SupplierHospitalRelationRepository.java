package com.spd.mcp.api.relation;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SupplierHospitalRelationRepository {
  private final JdbcTemplate jdbcTemplate;

  public SupplierHospitalRelationRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<Long> findSupplierIdsByHospital(long tenantId, long hospitalId) {
    return jdbcTemplate.queryForList(
        "SELECT supplier_id FROM biz_supplier_hospital WHERE tenant_id = ? AND hospital_id = ?",
        Long.class,
        tenantId,
        hospitalId);
  }

  public List<Long> findHospitalIdsBySupplier(long tenantId, long supplierId) {
    return jdbcTemplate.queryForList(
        "SELECT hospital_id FROM biz_supplier_hospital WHERE tenant_id = ? AND supplier_id = ?",
        Long.class,
        tenantId,
        supplierId);
  }

  public Map<Long, List<Long>> findHospitalIdsBySuppliers(long tenantId) {
    Map<Long, List<Long>> relations = new LinkedHashMap<>();
    jdbcTemplate.query(
        """
        SELECT supplier_id, hospital_id
        FROM biz_supplier_hospital
        WHERE tenant_id = ?
        ORDER BY supplier_id, hospital_id
        """,
        resultSet -> {
          long supplierId = resultSet.getLong("supplier_id");
          long hospitalId = resultSet.getLong("hospital_id");
          relations.computeIfAbsent(supplierId, ignored -> new ArrayList<>()).add(hospitalId);
        },
        tenantId);
    return relations;
  }

  public void replaceSuppliersForHospital(long tenantId, long hospitalId, List<Long> supplierIds) {
    jdbcTemplate.update(
        "DELETE FROM biz_supplier_hospital WHERE tenant_id = ? AND hospital_id = ?",
        tenantId,
        hospitalId);
    for (Long supplierId : supplierIds) {
      jdbcTemplate.update(
          "INSERT IGNORE INTO biz_supplier_hospital (tenant_id, supplier_id, hospital_id) VALUES (?, ?, ?)",
          tenantId,
          supplierId,
          hospitalId);
    }
  }

  public void replaceHospitalsForSupplier(long tenantId, long supplierId, List<Long> hospitalIds) {
    jdbcTemplate.update(
        "DELETE FROM biz_supplier_hospital WHERE tenant_id = ? AND supplier_id = ?",
        tenantId,
        supplierId);
    for (Long hospitalId : hospitalIds) {
      jdbcTemplate.update(
          "INSERT IGNORE INTO biz_supplier_hospital (tenant_id, supplier_id, hospital_id) VALUES (?, ?, ?)",
          tenantId,
          supplierId,
          hospitalId);
    }
  }
}
