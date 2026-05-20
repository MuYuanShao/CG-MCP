package com.spd.mcp.api.hospital;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HospitalRepository {
  private final JdbcTemplate jdbcTemplate;

  public HospitalRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<HospitalDto> findAll(long tenantId) {
    return jdbcTemplate.query("""
        SELECT id, hospital_code, hospital_name, hospital_level, city, contact_name,
          contact_phone, status, cooperation_date
        FROM biz_hospital
        WHERE tenant_id = ? AND deleted = 0
        ORDER BY id ASC
        """, this::mapHospital, tenantId);
  }

  public Optional<HospitalDto> findById(long tenantId, long id) {
    return jdbcTemplate.query("""
        SELECT id, hospital_code, hospital_name, hospital_level, city, contact_name,
          contact_phone, status, cooperation_date
        FROM biz_hospital
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, this::mapHospital, tenantId, id).stream().findFirst();
  }

  public void insert(long tenantId, long id, HospitalRequest request) {
    jdbcTemplate.update("""
        INSERT INTO biz_hospital (
          id, tenant_id, hospital_code, hospital_name, hospital_level, city,
          contact_name, contact_phone, status, cooperation_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE)
        """,
        id,
        tenantId,
        request.code(),
        request.name(),
        request.level(),
        request.city(),
        request.contact(),
        request.phone(),
        toDbStatus(request.status()));
  }

  public int update(long tenantId, long id, HospitalRequest request) {
    return jdbcTemplate.update("""
        UPDATE biz_hospital
        SET hospital_code = ?, hospital_name = ?, hospital_level = ?, city = ?,
          contact_name = ?, contact_phone = ?, status = ?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """,
        request.code(),
        request.name(),
        request.level(),
        request.city(),
        request.contact(),
        request.phone(),
        toDbStatus(request.status()),
        tenantId,
        id);
  }

  public int delete(long tenantId, long id) {
    return jdbcTemplate.update("""
        UPDATE biz_hospital
        SET deleted = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, tenantId, id);
  }

  private HospitalDto mapHospital(ResultSet rs, int rowNum) throws SQLException {
    java.sql.Date cooperationDate = rs.getDate("cooperation_date");
    return new HospitalDto(
        rs.getLong("id"),
        rs.getString("hospital_code"),
        rs.getString("hospital_name"),
        rs.getString("hospital_level"),
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
