package com.spd.mcp.api.settlement;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SettlementRepository {
  private final JdbcTemplate jdbcTemplate;
  private final DbIdGenerator idGenerator;

  public SettlementRepository(JdbcTemplate jdbcTemplate, DbIdGenerator idGenerator) {
    this.jdbcTemplate = jdbcTemplate;
    this.idGenerator = idGenerator;
  }

  public List<SettlementDto> list(long tenantId) {
    return jdbcTemplate.query("""
        SELECT
          s.id,
          s.settlement_no,
          COALESCE(h.hospital_name, '') AS hospital,
          s.settlement_start,
          s.settlement_end,
          s.total_amount,
          s.status
        FROM biz_settlement s
        LEFT JOIN biz_hospital h ON h.id = s.hospital_id AND h.tenant_id = s.tenant_id
        WHERE s.tenant_id = ? AND s.deleted = 0
        ORDER BY s.id DESC
        LIMIT 200
        """, (rs, rowNum) -> {
          Date ss = rs.getDate("settlement_start");
          Date se = rs.getDate("settlement_end");
          return new SettlementDto(
              rs.getLong("id"),
              rs.getString("settlement_no"),
              rs.getString("hospital"),
              ss == null ? null : ss.toLocalDate(),
              se == null ? null : se.toLocalDate(),
              rs.getBigDecimal("total_amount"),
              rs.getInt("status"));
        }, tenantId);
  }

  public SettlementDto findById(long tenantId, long settlementId) {
    List<SettlementDto> result = jdbcTemplate.query("""
        SELECT
          s.id,
          s.settlement_no,
          COALESCE(h.hospital_name, '') AS hospital,
          s.settlement_start,
          s.settlement_end,
          s.total_amount,
          s.status
        FROM biz_settlement s
        LEFT JOIN biz_hospital h ON h.id = s.hospital_id AND h.tenant_id = s.tenant_id
        WHERE s.tenant_id = ? AND s.id = ? AND s.deleted = 0
        """, (rs, rowNum) -> {
          Date ss = rs.getDate("settlement_start");
          Date se = rs.getDate("settlement_end");
          return new SettlementDto(
              rs.getLong("id"),
              rs.getString("settlement_no"),
              rs.getString("hospital"),
              ss == null ? null : ss.toLocalDate(),
              se == null ? null : se.toLocalDate(),
              rs.getBigDecimal("total_amount"),
              rs.getInt("status"));
        }, tenantId, settlementId);
    if (result.isEmpty()) {
      throw new BusinessException("NOT_FOUND", "结算单不存在");
    }
    return result.get(0);
  }

  public List<SettlementItemDto> findItems(long tenantId, long settlementId) {
    return jdbcTemplate.query("""
        SELECT
          si.id,
          si.acceptance_no,
          si.product_code,
          si.product_name,
          si.spec,
          COALESCE(si.batch_no, '') AS batch_no,
          COALESCE(si.registration_no, '') AS registration_no,
          si.qty,
          si.price,
          si.amount
        FROM biz_settlement_item si
        WHERE si.tenant_id = ? AND si.settlement_id = ? AND si.deleted = 0
        ORDER BY si.spec ASC, si.product_code ASC
        """, (rs, rowNum) -> new SettlementItemDto(
            rs.getLong("id"),
            rs.getString("acceptance_no"),
            rs.getString("product_code"),
            rs.getString("product_name"),
            rs.getString("spec"),
            rs.getString("batch_no"),
            rs.getString("registration_no"),
            rs.getInt("qty"),
            rs.getBigDecimal("price"),
            rs.getBigDecimal("amount")), tenantId, settlementId);
  }
}
