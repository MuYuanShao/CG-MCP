package com.spd.mcp.api.refund;

import java.sql.Date;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RefundRepository {
  private final JdbcTemplate jdbcTemplate;

  public RefundRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<RefundDto> findLatest(long tenantId) {
    return findDtos(tenantId, "");
  }

  public Optional<RefundStatus> findStatus(long tenantId, long refundId) {
    List<RefundStatus> rows = jdbcTemplate.query(
        "SELECT status FROM biz_refund WHERE tenant_id = ? AND id = ? AND deleted = 0",
        (rs, rowNum) -> RefundStatus.fromCode(rs.getInt("status")),
        tenantId,
        refundId);
    return rows.stream().findFirst();
  }

  public Optional<RefundDto> findById(long tenantId, long refundId) {
    return findDtos(tenantId, "AND r.id = ?", refundId).stream().findFirst();
  }

  public Optional<Long> findHospitalIdByName(long tenantId, String hospitalName) {
    return jdbcTemplate.queryForList(
        "SELECT id FROM biz_hospital WHERE tenant_id = ? AND hospital_name = ? AND deleted = 0 LIMIT 1",
        Long.class,
        tenantId,
        hospitalName).stream().findFirst();
  }

  public Optional<Long> findProductIdByName(long tenantId, String productName) {
    return jdbcTemplate.queryForList(
        "SELECT id FROM biz_product WHERE tenant_id = ? AND product_name = ? AND deleted = 0 LIMIT 1",
        Long.class,
        tenantId,
        productName).stream().findFirst();
  }

  public Optional<Long> findOrderIdByNo(long tenantId, String orderNo) {
    if (orderNo == null || orderNo.isBlank()) return Optional.empty();
    return jdbcTemplate.queryForList(
        "SELECT id FROM biz_purchase_order WHERE tenant_id = ? AND order_no = ? AND deleted = 0 LIMIT 1",
        Long.class,
        tenantId,
        orderNo).stream().findFirst();
  }

  public Optional<Long> findIdByRefundNo(long tenantId, String refundNo) {
    return jdbcTemplate.queryForList(
        "SELECT id FROM biz_refund WHERE tenant_id = ? AND refund_no = ? LIMIT 1",
        Long.class,
        tenantId,
        refundNo).stream().findFirst();
  }

  public void insert(long tenantId, long refundId, String refundNo, long hospitalId, long productId, Long orderId, RefundRequest request) {
    jdbcTemplate.update("""
        INSERT INTO biz_refund (
          id, tenant_id, refund_no, order_id, hospital_id, product_id, batch_no,
          refund_qty, refund_amount, refund_reason, apply_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        refundId,
        tenantId,
        refundNo,
        orderId,
        hospitalId,
        productId,
        request.batchNo(),
        request.refundQty(),
        request.refundAmount(),
        request.reason(),
        Date.valueOf(request.applyDate()),
        RefundStatus.PENDING_AUDIT.code());
  }

  public int update(long tenantId, long refundId, long hospitalId, long productId, Long orderId, RefundRequest request) {
    return jdbcTemplate.update("""
        UPDATE biz_refund
        SET order_id = ?, hospital_id = ?, product_id = ?, batch_no = ?,
          refund_qty = ?, refund_amount = ?, refund_reason = ?, apply_date = ?,
          updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0 AND status = ?
        """,
        orderId,
        hospitalId,
        productId,
        request.batchNo(),
        request.refundQty(),
        request.refundAmount(),
        request.reason(),
        Date.valueOf(request.applyDate()),
        tenantId,
        refundId,
        RefundStatus.PENDING_AUDIT.code());
  }

  public void upsertSynced(
      long tenantId,
      long refundId,
      RefundSyncRequest request,
      long hospitalId,
      long productId,
      Long orderId,
      RefundStatus status
  ) {
    jdbcTemplate.update("""
        INSERT INTO biz_refund (
          id, tenant_id, refund_no, order_id, hospital_id, product_id, batch_no,
          refund_qty, refund_amount, refund_reason, apply_date, status, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          order_id = VALUES(order_id),
          hospital_id = VALUES(hospital_id),
          product_id = VALUES(product_id),
          batch_no = VALUES(batch_no),
          refund_qty = VALUES(refund_qty),
          refund_amount = VALUES(refund_amount),
          refund_reason = VALUES(refund_reason),
          apply_date = VALUES(apply_date),
          status = VALUES(status),
          deleted = 0,
          updated_time = CURRENT_TIMESTAMP
        """,
        refundId,
        tenantId,
        request.refundNo(),
        orderId,
        hospitalId,
        productId,
        request.batchNo(),
        request.refundQty(),
        request.refundAmount(),
        request.reason(),
        Date.valueOf(request.applyDate()),
        status.code());
  }

  public int updateStatus(long tenantId, long refundId, RefundStatus expectedStatus, RefundStatus nextStatus) {
    return jdbcTemplate.update(
        "UPDATE biz_refund SET status = ?, updated_time = CURRENT_TIMESTAMP WHERE tenant_id = ? AND id = ? AND status = ? AND deleted = 0",
        nextStatus.code(),
        tenantId,
        refundId,
        expectedStatus.code());
  }

  private List<RefundDto> findDtos(long tenantId, String extraWhere, Object... args) {
    Object[] params = new Object[args.length + 1];
    params[0] = tenantId;
    System.arraycopy(args, 0, params, 1, args.length);
    return jdbcTemplate.query("""
        SELECT
          r.id,
          r.refund_no AS refund_no,
          h.hospital_name AS hospital,
          COALESCE(o.order_no, '') AS related_order_no,
          p.product_name AS product_name,
          r.batch_no AS batch_no,
          r.refund_qty AS refund_qty,
          r.refund_amount AS refund_amount,
          r.refund_reason AS reason,
          r.apply_date AS apply_date,
          r.status AS status
        FROM biz_refund r
        JOIN biz_hospital h ON h.id = r.hospital_id AND h.tenant_id = r.tenant_id
        JOIN biz_product p ON p.id = r.product_id AND p.tenant_id = r.tenant_id
        LEFT JOIN biz_purchase_order o ON o.id = r.order_id AND o.tenant_id = r.tenant_id
        WHERE r.deleted = 0 AND r.tenant_id = ?
        """ + extraWhere + """
        ORDER BY r.apply_date DESC, r.id DESC
        LIMIT 100
        """,
        (rs, rowNum) -> new RefundDto(
            rs.getLong("id"),
            rs.getString("refund_no"),
            rs.getString("hospital"),
            rs.getString("related_order_no"),
            rs.getString("product_name"),
            rs.getString("batch_no"),
            rs.getInt("refund_qty"),
            rs.getBigDecimal("refund_amount"),
            rs.getString("reason"),
            rs.getDate("apply_date").toLocalDate(),
            RefundStatus.fromCode(rs.getInt("status")).key()),
        params);
  }
}
