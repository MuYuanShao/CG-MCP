package com.spd.mcp.api.purchase;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.common.PageResult;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PurchaseRepository {
  private final JdbcTemplate jdbcTemplate;
  private final DbIdGenerator idGenerator;

  public PurchaseRepository(JdbcTemplate jdbcTemplate, DbIdGenerator idGenerator) {
    this.jdbcTemplate = jdbcTemplate;
    this.idGenerator = idGenerator;
  }

  public List<BusinessDocumentDto> plans(long tenantId) {
    return jdbcTemplate.query("""
        SELECT
          p.id,
          p.plan_no AS document_no,
          '' AS source_no,
          h.hospital_name AS hospital,
          pr.product_name AS product_name,
          p.plan_qty AS quantity,
          p.plan_qty * p.unit_price AS amount,
          p.expected_delivery_date AS business_date,
          CASE p.status
            WHEN 0 THEN 'draft'
            WHEN 1 THEN 'pending_approval'
            WHEN 2 THEN 'rejected'
            WHEN 3 THEN 'pending_order'
            WHEN 4 THEN 'partial_ordered'
            WHEN 5 THEN 'ordered'
            ELSE 'closed'
          END AS status
        FROM biz_purchase_plan p
        JOIN biz_hospital h ON h.id = p.hospital_id AND h.tenant_id = p.tenant_id
        JOIN biz_product pr ON pr.id = p.product_id AND pr.tenant_id = p.tenant_id
        WHERE p.tenant_id = ? AND p.deleted = 0
        ORDER BY p.created_time DESC
        LIMIT 100
        """, this::mapDocument, tenantId);
  }

  public List<BusinessDocumentDto> orders(long tenantId, PurchaseOrderSearchRequest request) {
    StringBuilder sql = new StringBuilder("""
        SELECT
          o.id,
          o.order_no AS document_no,
          COALESCE(p.plan_no, '') AS source_no,
          h.hospital_name AS hospital,
          COALESCE(GROUP_CONCAT(DISTINCT pr.product_name ORDER BY pr.product_name SEPARATOR '、'), '') AS product_name,
          COALESCE(SUM(i.delivered_qty), 0) AS quantity,
          o.total_amount AS amount,
          o.order_date AS business_date,
          CASE o.status
            WHEN 0 THEN 'pending_confirm'
            WHEN 1 THEN 'confirmed'
            WHEN 2 THEN 'partial_shipped'
            WHEN 3 THEN 'shipped'
            WHEN 4 THEN 'arrived'
            WHEN 5 THEN 'accepted'
            WHEN 6 THEN 'completed'
            ELSE 'closed'
          END AS status
        FROM biz_purchase_order o
        LEFT JOIN biz_purchase_plan p ON p.id = o.plan_id AND p.tenant_id = o.tenant_id
        JOIN biz_hospital h ON h.id = o.hospital_id AND h.tenant_id = o.tenant_id
        LEFT JOIN biz_delivery_order d ON d.order_id = o.id AND d.tenant_id = o.tenant_id AND d.deleted = 0
        LEFT JOIN biz_delivery_order_item i ON i.delivery_id = d.id AND i.tenant_id = d.tenant_id AND i.deleted = 0
        LEFT JOIN biz_product pr ON pr.id = i.product_id AND pr.tenant_id = i.tenant_id
        WHERE o.tenant_id = ? AND o.deleted = 0
        """);
    List<Object> params = new ArrayList<>();
    params.add(tenantId);
    appendLike(sql, params, "o.order_no", request == null ? null : request.orderNo());
    appendLike(sql, params, "p.plan_no", request == null ? null : request.sourcePlan());
    appendLike(sql, params, "h.hospital_name", request == null ? null : request.hospital());
    if (request != null && request.startDate() != null) {
      sql.append(" AND o.order_date >= ?");
      params.add(request.startDate());
    }
    if (request != null && request.endDate() != null) {
      sql.append(" AND o.order_date <= ?");
      params.add(request.endDate());
    }
    appendOrderProductLike(sql, params, tenantId, request == null ? null : request.productName());
    sql.append("""
        GROUP BY o.id, o.order_no, p.plan_no, h.hospital_name, o.total_amount, o.order_date, o.status, o.created_time
        ORDER BY o.order_date DESC, o.created_time DESC
        LIMIT 100
        """);
    return jdbcTemplate.query(sql.toString(), this::mapDocument, params.toArray());
  }

  public PageResult<DeliveryEditItemDto> orderItems(
      long tenantId,
      long orderId,
      PurchaseOrderItemSearchRequest request
  ) {
    String fromSql = """
        FROM biz_purchase_order o
        JOIN biz_delivery_order d ON d.order_id = o.id AND d.tenant_id = o.tenant_id AND d.deleted = 0
        JOIN biz_delivery_order_item i ON i.delivery_id = d.id AND i.tenant_id = d.tenant_id AND i.deleted = 0
        JOIN biz_product pr ON pr.id = i.product_id AND pr.tenant_id = i.tenant_id
        WHERE o.tenant_id = ? AND o.id = ? AND o.deleted = 0
        """;
    StringBuilder whereSql = new StringBuilder(fromSql);
    List<Object> params = new ArrayList<>();
    params.add(tenantId);
    params.add(orderId);
    appendLike(whereSql, params, "pr.product_code", request == null ? null : request.productCode());
    appendLike(whereSql, params, "pr.product_name", request == null ? null : request.productName());
    appendLike(whereSql, params, "i.batch_no", request == null ? null : request.batchNo());
    appendLike(whereSql, params, "pr.manufacturer", request == null ? null : request.manufacturer());

    Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) " + whereSql, Long.class, params.toArray());
    long size = request == null ? 10 : request.size();
    long current = request == null ? 1 : request.current();
    long offset = (current - 1) * size;
    List<Object> pageParams = new ArrayList<>(params);
    pageParams.add(size);
    pageParams.add(offset);
    List<DeliveryEditItemDto> records = jdbcTemplate.query("""
        SELECT i.id, i.product_id, pr.product_code, pr.product_name, pr.spec, pr.model, pr.unit,
          pr.price, pr.manufacturer, i.plan_qty, i.delivered_qty, i.production_date,
          i.expiry_date, i.batch_no, i.remark
        """ + whereSql + """
        ORDER BY i.id ASC
        LIMIT ? OFFSET ?
        """, this::mapDeliveryItem, pageParams.toArray());
    return new PageResult<>(records, total == null ? 0 : total, current, size);
  }

  public List<BusinessDocumentDto> deliveries(long tenantId) {
    return jdbcTemplate.query("""
        SELECT
          d.id,
          d.delivery_no AS document_no,
          o.order_no AS source_no,
          h.hospital_name AS hospital,
          '' AS product_name,
          NULL AS quantity,
          o.total_amount AS amount,
          DATE(d.created_time) AS business_date,
          CASE d.status
            WHEN 0 THEN 'pending_shipment'
            WHEN 1 THEN 'picking'
            WHEN 2 THEN 'shipped'
            WHEN 3 THEN 'logistics_exception'
            WHEN 4 THEN 'arrived'
            ELSE 'recalled'
          END AS status
        FROM biz_delivery_order d
        JOIN biz_purchase_order o ON o.id = d.order_id AND o.tenant_id = d.tenant_id
        JOIN biz_hospital h ON h.id = o.hospital_id AND h.tenant_id = o.tenant_id
        WHERE d.tenant_id = ? AND d.deleted = 0
        ORDER BY d.created_time DESC
        LIMIT 100
        """, this::mapDocument, tenantId);
  }

  public List<BusinessDocumentDto> shipments(long tenantId) {
    return jdbcTemplate.query("""
        SELECT
          s.id,
          s.shipment_no AS document_no,
          d.delivery_no AS source_no,
          h.hospital_name AS hospital,
          '' AS product_name,
          NULL AS quantity,
          o.total_amount AS amount,
          s.ship_date AS business_date,
          CASE s.status
            WHEN 0 THEN 'pending_outbound'
            WHEN 1 THEN 'outbound'
            WHEN 2 THEN 'in_transit'
            WHEN 3 THEN 'signed'
            ELSE 'sign_exception'
          END AS status
        FROM biz_shipment_order s
        JOIN biz_delivery_order d ON d.id = s.delivery_id AND d.tenant_id = s.tenant_id
        JOIN biz_purchase_order o ON o.id = d.order_id AND o.tenant_id = d.tenant_id
        JOIN biz_hospital h ON h.id = o.hospital_id AND h.tenant_id = o.tenant_id
        WHERE s.tenant_id = ? AND s.deleted = 0
        ORDER BY s.created_time DESC
        LIMIT 100
        """, this::mapDocument, tenantId);
  }

  public DeliveryEditDto getOrCreateDeliveryEditByPlanNo(long tenantId, String planNo) {
    PlanSeed plan = findPlanSeed(tenantId, planNo)
        .orElseThrow(() -> new BusinessException("PLAN_NOT_FOUND", "采购计划不存在", HttpStatus.NOT_FOUND));
    int remainingQty = remainingPlanQty(tenantId, plan.id(), plan.planQty());
    if (remainingQty <= 0) {
      throw new BusinessException("PLAN_FULLY_ORDERED", "采购计划已全部转订单，不能重复转换");
    }
    long orderId = createOrderFromPlan(tenantId, plan, remainingQty);
    OrderSeed order = findOrderSeed(tenantId, orderId)
        .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "采购订单不存在", HttpStatus.NOT_FOUND));
    long deliveryId = findDeliveryIdByOrderId(tenantId, orderId).orElseGet(() -> createDeliveryFromOrder(tenantId, orderId));
    seedDeliveryItemIfEmpty(tenantId, deliveryId, plan, remainingQty);
    return findDeliveryEditById(tenantId, deliveryId, plan, order);
  }

  public BusinessDocumentDto confirmOrder(long tenantId, long orderId) {
    int updated = jdbcTemplate.update("""
        UPDATE biz_purchase_order
        SET status = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0 AND status = 0
        """, tenantId, orderId);
    if (updated != 1) {
      findOrderDocumentById(tenantId, orderId)
          .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "采购订单不存在", HttpStatus.NOT_FOUND));
      throw new BusinessException("ORDER_STATUS_INVALID", "仅待确认采购订单允许确认");
    }
    return findOrderDocumentById(tenantId, orderId)
        .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "采购订单不存在", HttpStatus.NOT_FOUND));
  }

  public DeliveryEditDto getOrCreateDeliveryEditByOrderId(long tenantId, long orderId) {
    DeliveryContext context = findDeliveryContextByOrderId(tenantId, orderId)
        .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "采购订单不存在或未关联采购计划", HttpStatus.NOT_FOUND));
    long deliveryId = findDeliveryIdByOrderId(tenantId, orderId).orElseGet(() -> createDeliveryFromOrder(tenantId, orderId));
    seedDeliveryItemIfEmpty(tenantId, deliveryId, context.plan(), context.plan().planQty());
    return findDeliveryEditById(tenantId, deliveryId, context.plan(), context.order());
  }

  public DeliveryEditDto saveDeliveryEdit(long tenantId, long deliveryId, DeliveryEditSaveRequest request) {
    validateDeliveryEditRequest(request);
    int nextStatus = Boolean.TRUE.equals(request.submitted()) ? 2 : 1;
    int deliveryUpdated = jdbcTemplate.update("""
        UPDATE biz_delivery_order
        SET delivery_date = ?, remark = ?, status = ?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0 AND status IN (0, 1)
        """, request.deliveryDate(), request.remark(), nextStatus, tenantId, deliveryId);
    if (deliveryUpdated != 1) {
      findDeliveryStatus(tenantId, deliveryId)
          .orElseThrow(() -> new BusinessException("DELIVERY_NOT_FOUND", "配送单不存在", HttpStatus.NOT_FOUND));
      throw new BusinessException("DELIVERY_STATUS_INVALID", "仅待发货或拣货中配送单允许保存");
    }
    for (DeliveryEditItemRequest item : request.items()) {
      int itemUpdated = jdbcTemplate.update("""
          UPDATE biz_delivery_order_item
          SET delivered_qty = ?, production_date = ?, expiry_date = ?, batch_no = ?, remark = ?,
            updated_time = CURRENT_TIMESTAMP
          WHERE tenant_id = ? AND delivery_id = ? AND id = ? AND deleted = 0
          """,
          item.deliveredQty(),
          item.productionDate(),
          item.expiryDate(),
          item.batchNo(),
          item.remark(),
          tenantId,
          deliveryId,
          item.id());
      if (itemUpdated != 1) {
        throw new BusinessException("DELIVERY_ITEM_NOT_FOUND", "配送单明细不存在或已删除", HttpStatus.NOT_FOUND);
      }
    }
    DeliveryContext context = findDeliveryContext(tenantId, deliveryId)
        .orElseThrow(() -> new BusinessException("DELIVERY_NOT_FOUND", "配送单不存在", HttpStatus.NOT_FOUND));
    refreshOrderAmount(tenantId, context.order().id(), context.plan().unitPrice());
    refreshPlanOrderStatus(tenantId, context.plan().id(), context.plan().planQty());
    return findDeliveryEditById(tenantId, deliveryId, context.plan(), context.order());
  }

  public void submitDelivery(long tenantId, long deliveryId) {
    int updated = jdbcTemplate.update("""
        UPDATE biz_delivery_order
        SET status = 2, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0 AND status IN (0, 1)
        """, tenantId, deliveryId);
    if (updated != 1) {
      findDeliveryStatus(tenantId, deliveryId)
          .orElseThrow(() -> new BusinessException("DELIVERY_NOT_FOUND", "配送单不存在", HttpStatus.NOT_FOUND));
      throw new BusinessException("DELIVERY_STATUS_INVALID", "仅待发货或拣货中配送单允许提交");
    }
  }

  public void deleteDeliveries(long tenantId, List<Long> ids) {
    for (Long id : ids) {
      jdbcTemplate.update("""
          UPDATE biz_delivery_order
          SET deleted = 1, updated_time = CURRENT_TIMESTAMP
          WHERE tenant_id = ? AND id = ? AND deleted = 0
          """, tenantId, id);
      jdbcTemplate.update("""
          UPDATE biz_delivery_order_item
          SET deleted = 1, updated_time = CURRENT_TIMESTAMP
          WHERE tenant_id = ? AND delivery_id = ? AND deleted = 0
          """, tenantId, id);
    }
  }

  public BusinessDocumentDto getOrCreateShipmentByDeliveryId(long tenantId, long deliveryId) {
    DeliveryOrderSeed delivery = findDeliveryOrderSeed(tenantId, deliveryId)
        .orElseThrow(() -> new BusinessException("DELIVERY_NOT_FOUND", "配送单不存在", HttpStatus.NOT_FOUND));
    if (delivery.status() != 2) {
      throw new BusinessException("DELIVERY_STATUS_INVALID", "仅已提交配送单允许生成发货单");
    }
    long shipmentId = findShipmentIdByDeliveryId(tenantId, deliveryId).orElseGet(() -> createShipmentFromDelivery(tenantId, deliveryId));
    jdbcTemplate.update("""
        UPDATE biz_delivery_order
        SET status = CASE WHEN status < 2 THEN 2 ELSE status END, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, tenantId, delivery.id());
    jdbcTemplate.update("""
        UPDATE biz_purchase_order
        SET status = CASE WHEN status < 3 THEN 3 ELSE status END, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, tenantId, delivery.orderId());
    return findShipmentDocumentById(tenantId, shipmentId)
        .orElseThrow(() -> new BusinessException("SHIPMENT_NOT_FOUND", "发货单不存在", HttpStatus.NOT_FOUND));
  }

  public BusinessDocumentDto updateShipmentStatus(long tenantId, long shipmentId, int expectedStatus, int nextStatus, String message) {
    int updated = jdbcTemplate.update("""
        UPDATE biz_shipment_order
        SET status = ?, ship_date = COALESCE(ship_date, CURRENT_DATE), updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0 AND status = ?
        """, nextStatus, tenantId, shipmentId, expectedStatus);
    if (updated != 1) {
      findShipmentDocumentById(tenantId, shipmentId)
          .orElseThrow(() -> new BusinessException("SHIPMENT_NOT_FOUND", "发货单不存在", HttpStatus.NOT_FOUND));
      throw new BusinessException("SHIPMENT_STATUS_INVALID", message);
    }
    return findShipmentDocumentById(tenantId, shipmentId)
        .orElseThrow(() -> new BusinessException("SHIPMENT_NOT_FOUND", "发货单不存在", HttpStatus.NOT_FOUND));
  }

  public void deleteShipments(long tenantId, List<Long> ids) {
    for (Long id : ids) {
      jdbcTemplate.update("""
          UPDATE biz_shipment_order
          SET deleted = 1, updated_time = CURRENT_TIMESTAMP
          WHERE tenant_id = ? AND id = ? AND deleted = 0
          """, tenantId, id);
    }
  }

  private BusinessDocumentDto mapDocument(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
    java.sql.Date businessDate = rs.getDate("business_date");
    Object quantity = rs.getObject("quantity");
    return new BusinessDocumentDto(
        rs.getLong("id"),
        rs.getString("document_no"),
        rs.getString("source_no"),
        rs.getString("hospital"),
        rs.getString("product_name"),
        quantity == null ? null : ((Number) quantity).intValue(),
        rs.getBigDecimal("amount"),
        businessDate == null ? null : businessDate.toLocalDate(),
        rs.getString("status"));
  }

  private void appendLike(StringBuilder sql, List<Object> params, String column, String value) {
    if (value == null || value.isBlank()) return;
    sql.append(" AND ").append(column).append(" LIKE ?");
    params.add("%" + value.trim() + "%");
  }

  private void appendOrderProductLike(StringBuilder sql, List<Object> params, long tenantId, String productName) {
    if (productName == null || productName.isBlank()) return;
    sql.append("""
         AND EXISTS (
          SELECT 1
          FROM biz_delivery_order d2
          JOIN biz_delivery_order_item i2 ON i2.delivery_id = d2.id AND i2.tenant_id = d2.tenant_id AND i2.deleted = 0
          JOIN biz_product pr2 ON pr2.id = i2.product_id AND pr2.tenant_id = i2.tenant_id
          WHERE d2.tenant_id = ? AND d2.order_id = o.id AND d2.deleted = 0 AND pr2.product_name LIKE ?
        )
        """);
    params.add(tenantId);
    params.add("%" + productName.trim() + "%");
  }

  private Optional<PlanSeed> findPlanSeed(long tenantId, String planNo) {
    return jdbcTemplate.query("""
        SELECT p.id, p.plan_no, p.hospital_id, p.product_id, p.plan_qty, p.unit_price,
          pr.product_code, pr.product_name, pr.spec, pr.model, pr.unit, pr.manufacturer
        FROM biz_purchase_plan p
        JOIN biz_product pr ON pr.id = p.product_id AND pr.tenant_id = p.tenant_id
        WHERE p.tenant_id = ? AND p.plan_no = ? AND p.deleted = 0
        """, this::mapPlanSeed, tenantId, planNo).stream().findFirst();
  }

  private int remainingPlanQty(long tenantId, long planId, int planQty) {
    Integer orderedQty = jdbcTemplate.queryForObject("""
        SELECT COALESCE(SUM(i.delivered_qty), 0)
        FROM biz_purchase_order o
        JOIN biz_delivery_order d ON d.order_id = o.id AND d.tenant_id = o.tenant_id AND d.deleted = 0
        JOIN biz_delivery_order_item i ON i.delivery_id = d.id AND i.tenant_id = d.tenant_id AND i.deleted = 0
        WHERE o.tenant_id = ? AND o.plan_id = ? AND o.deleted = 0
        """, Integer.class, tenantId, planId);
    return Math.max(0, planQty - (orderedQty == null ? 0 : orderedQty));
  }

  private Optional<OrderSeed> findOrderSeed(long tenantId, long orderId) {
    return jdbcTemplate.query("""
        SELECT o.id, o.order_no, o.plan_id
        FROM biz_purchase_order o
        WHERE o.tenant_id = ? AND o.id = ? AND o.deleted = 0
        """, (rs, rowNum) -> new OrderSeed(rs.getLong("id"), rs.getString("order_no"), rs.getLong("plan_id")),
        tenantId,
        orderId).stream().findFirst();
  }

  private long createOrderFromPlan(long tenantId, PlanSeed plan, int orderQty) {
    long id = idGenerator.nextId("biz_purchase_order");
    String orderNo = "PO" + LocalDate.now().toString().replace("-", "") + String.format("%04d", id);
    jdbcTemplate.update("""
        INSERT INTO biz_purchase_order (
          id, tenant_id, order_no, plan_id, hospital_id, total_amount, order_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, 0)
        """,
        id,
        tenantId,
        orderNo,
        plan.id(),
        plan.hospitalId(),
        plan.unitPrice().multiply(BigDecimal.valueOf(orderQty)));
    jdbcTemplate.update(
        "UPDATE biz_purchase_plan SET status = 4, updated_time = CURRENT_TIMESTAMP WHERE tenant_id = ? AND id = ? AND status <> 5",
        tenantId,
        plan.id());
    return id;
  }

  private Optional<Long> findDeliveryIdByOrderId(long tenantId, long orderId) {
    return jdbcTemplate.queryForList(
        "SELECT id FROM biz_delivery_order WHERE tenant_id = ? AND order_id = ? AND deleted = 0 ORDER BY id ASC LIMIT 1",
        Long.class,
        tenantId,
        orderId).stream().findFirst();
  }

  private long createDeliveryFromOrder(long tenantId, long orderId) {
    long id = idGenerator.nextId("biz_delivery_order");
    String deliveryNo = "DL" + LocalDate.now().toString().replace("-", "") + String.format("%04d", id);
    jdbcTemplate.update("""
        INSERT INTO biz_delivery_order (id, tenant_id, delivery_no, order_id, delivery_date, status)
        VALUES (?, ?, ?, ?, CURRENT_DATE, 0)
        """, id, tenantId, deliveryNo, orderId);
    return id;
  }

  private void seedDeliveryItemIfEmpty(long tenantId, long deliveryId, PlanSeed plan, int qty) {
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM biz_delivery_order_item WHERE tenant_id = ? AND delivery_id = ? AND deleted = 0",
        Integer.class,
        tenantId,
        deliveryId);
    if (count != null && count > 0) return;
    long id = idGenerator.nextId("biz_delivery_order_item");
    jdbcTemplate.update("""
        INSERT INTO biz_delivery_order_item (
          id, tenant_id, delivery_id, product_id, plan_qty, delivered_qty, batch_no
        ) VALUES (?, ?, ?, ?, ?, ?, '')
        """, id, tenantId, deliveryId, plan.productId(), qty, qty);
  }

  private void refreshPlanOrderStatus(long tenantId, long planId, int planQty) {
    int remainingQty = remainingPlanQty(tenantId, planId, planQty);
    int nextStatus = remainingQty <= 0 ? 5 : remainingQty < planQty ? 4 : 3;
    jdbcTemplate.update("""
        UPDATE biz_purchase_plan
        SET status = ?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, nextStatus, tenantId, planId);
  }

  private void refreshOrderAmount(long tenantId, long orderId, BigDecimal unitPrice) {
    Integer orderQty = jdbcTemplate.queryForObject("""
        SELECT COALESCE(SUM(i.delivered_qty), 0)
        FROM biz_delivery_order d
        JOIN biz_delivery_order_item i ON i.delivery_id = d.id AND i.tenant_id = d.tenant_id AND i.deleted = 0
        WHERE d.tenant_id = ? AND d.order_id = ? AND d.deleted = 0
        """, Integer.class, tenantId, orderId);
    jdbcTemplate.update("""
        UPDATE biz_purchase_order
        SET total_amount = ?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, unitPrice.multiply(BigDecimal.valueOf(orderQty == null ? 0 : orderQty)), tenantId, orderId);
  }

  private DeliveryEditDto findDeliveryEditById(long tenantId, long deliveryId, PlanSeed plan, OrderSeed order) {
    DeliverySeed delivery = jdbcTemplate.query("""
        SELECT id, delivery_no, delivery_date, status, remark
        FROM biz_delivery_order
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, this::mapDeliverySeed, tenantId, deliveryId).stream()
        .findFirst()
        .orElseThrow(() -> new BusinessException("DELIVERY_NOT_FOUND", "配送单不存在", HttpStatus.NOT_FOUND));
    List<DeliveryEditItemDto> items = jdbcTemplate.query("""
        SELECT i.id, i.product_id, pr.product_code, pr.product_name, pr.spec, pr.model, pr.unit,
          pr.price, pr.manufacturer, i.plan_qty, i.delivered_qty, i.production_date,
          i.expiry_date, i.batch_no, i.remark
        FROM biz_delivery_order_item i
        JOIN biz_product pr ON pr.id = i.product_id AND pr.tenant_id = i.tenant_id
        WHERE i.tenant_id = ? AND i.delivery_id = ? AND i.deleted = 0
        ORDER BY i.id ASC
        """, this::mapDeliveryItem, tenantId, deliveryId);
    return new DeliveryEditDto(
        plan.id(),
        plan.planNo(),
        order.id(),
        order.orderNo(),
        delivery.id(),
        delivery.deliveryNo(),
        delivery.deliveryDate(),
        delivery.status(),
        delivery.remark(),
        items);
  }

  private Optional<DeliveryContext> findDeliveryContext(long tenantId, long deliveryId) {
    return jdbcTemplate.query("""
        SELECT p.id, p.plan_no, p.hospital_id, p.product_id, p.plan_qty, p.unit_price,
          pr.product_code, pr.product_name, pr.spec, pr.model, pr.unit, pr.manufacturer,
          o.id AS order_id, o.order_no, o.plan_id AS order_plan_id
        FROM biz_delivery_order d
        JOIN biz_purchase_order o ON o.id = d.order_id AND o.tenant_id = d.tenant_id
        JOIN biz_purchase_plan p ON p.id = o.plan_id AND p.tenant_id = o.tenant_id
        JOIN biz_product pr ON pr.id = p.product_id AND pr.tenant_id = p.tenant_id
        WHERE d.tenant_id = ? AND d.id = ? AND d.deleted = 0
        """, (rs, rowNum) -> new DeliveryContext(mapPlanSeed(rs, rowNum), new OrderSeed(
            rs.getLong("order_id"),
            rs.getString("order_no"),
            rs.getLong("order_plan_id"))), tenantId, deliveryId).stream().findFirst();
  }

  private Optional<DeliveryContext> findDeliveryContextByOrderId(long tenantId, long orderId) {
    return jdbcTemplate.query("""
        SELECT p.id, p.plan_no, p.hospital_id, p.product_id, p.plan_qty, p.unit_price,
          pr.product_code, pr.product_name, pr.spec, pr.model, pr.unit, pr.manufacturer,
          o.id AS order_id, o.order_no, o.plan_id AS order_plan_id
        FROM biz_purchase_order o
        JOIN biz_purchase_plan p ON p.id = o.plan_id AND p.tenant_id = o.tenant_id
        JOIN biz_product pr ON pr.id = p.product_id AND pr.tenant_id = p.tenant_id
        WHERE o.tenant_id = ? AND o.id = ? AND o.deleted = 0
        """, (rs, rowNum) -> new DeliveryContext(mapPlanSeed(rs, rowNum), new OrderSeed(
            rs.getLong("order_id"),
            rs.getString("order_no"),
            rs.getLong("order_plan_id"))), tenantId, orderId).stream().findFirst();
  }

  private Optional<BusinessDocumentDto> findOrderDocumentById(long tenantId, long orderId) {
    return jdbcTemplate.query("""
        SELECT
          o.id,
          o.order_no AS document_no,
          COALESCE(p.plan_no, '') AS source_no,
          h.hospital_name AS hospital,
          '' AS product_name,
          NULL AS quantity,
          o.total_amount AS amount,
          o.order_date AS business_date,
          CASE o.status
            WHEN 0 THEN 'pending_confirm'
            WHEN 1 THEN 'confirmed'
            WHEN 2 THEN 'partial_shipped'
            WHEN 3 THEN 'shipped'
            WHEN 4 THEN 'arrived'
            WHEN 5 THEN 'accepted'
            WHEN 6 THEN 'completed'
            ELSE 'closed'
          END AS status
        FROM biz_purchase_order o
        LEFT JOIN biz_purchase_plan p ON p.id = o.plan_id AND p.tenant_id = o.tenant_id
        JOIN biz_hospital h ON h.id = o.hospital_id AND h.tenant_id = o.tenant_id
        WHERE o.tenant_id = ? AND o.id = ? AND o.deleted = 0
        """, this::mapDocument, tenantId, orderId).stream().findFirst();
  }

  private Optional<DeliveryOrderSeed> findDeliveryOrderSeed(long tenantId, long deliveryId) {
    return jdbcTemplate.query("""
        SELECT id, order_id, status
        FROM biz_delivery_order
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, (rs, rowNum) -> new DeliveryOrderSeed(rs.getLong("id"), rs.getLong("order_id"), rs.getInt("status")),
        tenantId,
        deliveryId).stream().findFirst();
  }

  private Optional<Integer> findDeliveryStatus(long tenantId, long deliveryId) {
    return jdbcTemplate.queryForList(
        "SELECT status FROM biz_delivery_order WHERE tenant_id = ? AND id = ? AND deleted = 0",
        Integer.class,
        tenantId,
        deliveryId).stream().findFirst();
  }

  private Optional<Long> findShipmentIdByDeliveryId(long tenantId, long deliveryId) {
    return jdbcTemplate.queryForList(
        "SELECT id FROM biz_shipment_order WHERE tenant_id = ? AND delivery_id = ? AND deleted = 0 ORDER BY id ASC LIMIT 1",
        Long.class,
        tenantId,
        deliveryId).stream().findFirst();
  }

  private long createShipmentFromDelivery(long tenantId, long deliveryId) {
    long id = idGenerator.nextId("biz_shipment_order");
    String shipmentNo = "FH" + LocalDate.now().toString().replace("-", "") + String.format("%04d", id);
    String batchNo = jdbcTemplate.queryForList("""
        SELECT batch_no
        FROM biz_delivery_order_item
        WHERE tenant_id = ? AND delivery_id = ? AND deleted = 0
        ORDER BY id ASC LIMIT 1
        """, String.class, tenantId, deliveryId).stream().findFirst().orElse("");
    jdbcTemplate.update("""
        INSERT INTO biz_shipment_order (id, tenant_id, shipment_no, delivery_id, carrier, batch_no, ship_date, status)
        VALUES (?, ?, ?, ?, '待分配', ?, CURRENT_DATE, 0)
        """, id, tenantId, shipmentNo, deliveryId, batchNo);
    return id;
  }

  private Optional<BusinessDocumentDto> findShipmentDocumentById(long tenantId, long shipmentId) {
    return jdbcTemplate.query("""
        SELECT
          s.id,
          s.shipment_no AS document_no,
          d.delivery_no AS source_no,
          h.hospital_name AS hospital,
          '' AS product_name,
          NULL AS quantity,
          o.total_amount AS amount,
          s.ship_date AS business_date,
          CASE s.status
            WHEN 0 THEN 'pending_outbound'
            WHEN 1 THEN 'outbound'
            WHEN 2 THEN 'in_transit'
            WHEN 3 THEN 'signed'
            ELSE 'sign_exception'
          END AS status
        FROM biz_shipment_order s
        JOIN biz_delivery_order d ON d.id = s.delivery_id AND d.tenant_id = s.tenant_id
        JOIN biz_purchase_order o ON o.id = d.order_id AND o.tenant_id = d.tenant_id
        JOIN biz_hospital h ON h.id = o.hospital_id AND h.tenant_id = o.tenant_id
        WHERE s.tenant_id = ? AND s.id = ? AND s.deleted = 0
        """, this::mapDocument, tenantId, shipmentId).stream().findFirst();
  }

  private void validateDeliveryEditRequest(DeliveryEditSaveRequest request) {
    if (request == null) {
      throw new BusinessException("DELIVERY_REQUEST_INVALID", "配送单请求不能为空");
    }
    if (request.items() == null || request.items().isEmpty()) {
      throw new BusinessException("DELIVERY_ITEMS_REQUIRED", "配送单明细不能为空");
    }
    for (DeliveryEditItemRequest item : request.items()) {
      if (item.id() == null) {
        throw new BusinessException("DELIVERY_ITEM_INVALID", "配送单明细 ID 不能为空");
      }
      if (item.planQty() == null || item.planQty() < 0) {
        throw new BusinessException("DELIVERY_ITEM_INVALID", "计划数量不能小于 0");
      }
      if (item.deliveredQty() == null || item.deliveredQty() < 0) {
        throw new BusinessException("DELIVERY_ITEM_INVALID", "本次数量不能小于 0");
      }
      if (item.deliveredQty() > item.planQty()) {
        throw new BusinessException("DELIVERY_ITEM_INVALID", "本次数量不能超过计划数量");
      }
      if (item.productionDate() != null
          && item.expiryDate() != null
          && item.expiryDate().isBefore(item.productionDate())) {
        throw new BusinessException("DELIVERY_ITEM_INVALID", "有效期不能早于生产日期");
      }
      if (Boolean.TRUE.equals(request.submitted())
          && (item.batchNo() == null || item.batchNo().isBlank())) {
        throw new BusinessException("DELIVERY_ITEM_INVALID", "提交配送单时批号不能为空");
      }
    }
  }

  private PlanSeed mapPlanSeed(ResultSet rs, int rowNum) throws SQLException {
    return new PlanSeed(
        rs.getLong("id"),
        rs.getString("plan_no"),
        rs.getLong("hospital_id"),
        rs.getLong("product_id"),
        rs.getInt("plan_qty"),
        rs.getBigDecimal("unit_price"),
        rs.getString("product_code"),
        rs.getString("product_name"),
        rs.getString("spec"),
        rs.getString("model"),
        rs.getString("unit"),
        rs.getString("manufacturer"));
  }

  private DeliverySeed mapDeliverySeed(ResultSet rs, int rowNum) throws SQLException {
    Date deliveryDate = rs.getDate("delivery_date");
    return new DeliverySeed(
        rs.getLong("id"),
        rs.getString("delivery_no"),
        deliveryDate == null ? null : deliveryDate.toLocalDate(),
        toDeliveryStatus(rs.getInt("status")),
        rs.getString("remark"));
  }

  private String toDeliveryStatus(int status) {
    return switch (status) {
      case 1 -> "picking";
      case 2 -> "shipped";
      case 3 -> "logistics_exception";
      case 4 -> "arrived";
      case 5 -> "withdrawn";
      default -> "pending_ship";
    };
  }

  private DeliveryEditItemDto mapDeliveryItem(ResultSet rs, int rowNum) throws SQLException {
    Date productionDate = rs.getDate("production_date");
    Date expiryDate = rs.getDate("expiry_date");
    return new DeliveryEditItemDto(
        rs.getLong("id"),
        rs.getLong("product_id"),
        rs.getString("product_code"),
        rs.getString("product_name"),
        rs.getString("spec"),
        rs.getString("model"),
        rs.getString("unit"),
        rs.getBigDecimal("price"),
        rs.getString("manufacturer"),
        rs.getInt("plan_qty"),
        rs.getInt("delivered_qty"),
        productionDate == null ? null : productionDate.toLocalDate(),
        expiryDate == null ? null : expiryDate.toLocalDate(),
        rs.getString("batch_no"),
        rs.getString("remark"));
  }

  private record PlanSeed(
      long id,
      String planNo,
      long hospitalId,
      long productId,
      int planQty,
      BigDecimal unitPrice,
      String productCode,
      String productName,
      String spec,
      String model,
      String unit,
      String manufacturer
  ) {}

  private record OrderSeed(long id, String orderNo, long planId) {}

  private record DeliverySeed(long id, String deliveryNo, LocalDate deliveryDate, String status, String remark) {}

  private record DeliveryOrderSeed(long id, long orderId, int status) {}

  private record DeliveryContext(PlanSeed plan, OrderSeed order) {}
}
