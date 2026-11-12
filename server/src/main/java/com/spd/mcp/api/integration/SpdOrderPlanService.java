package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import java.math.BigDecimal;
import java.sql.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static com.spd.mcp.api.integration.IntegrationTypes.OrderItem;
import static com.spd.mcp.api.integration.IntegrationTypes.OrderRequest;

/** Projects SPD-PR orders into the native purchase plan list without starting a second purchasing workflow. */
@Service
public class SpdOrderPlanService implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(SpdOrderPlanService.class);
  private final JdbcTemplate db;
  private final DbIdGenerator ids;
  private final IntegrationRepository repo;
  private final ObjectMapper mapper;
  private final TransactionTemplate transactions;

  public SpdOrderPlanService(JdbcTemplate db, DbIdGenerator ids, IntegrationRepository repo,
      ObjectMapper mapper, PlatformTransactionManager transactionManager) {
    this.db = db;
    this.ids = ids;
    this.repo = repo;
    this.mapper = mapper;
    this.transactions = new TransactionTemplate(transactionManager);
  }

  private record Source(long tenant, String instance, String order) {}

  public void sync(long tenant, String instance, OrderRequest order, Map<String,Long> productIds) {
    var existing = db.query("""
        SELECT spd_line_id,id FROM biz_purchase_plan
        WHERE tenant_id=? AND spd_instance_id=? AND spd_order_no=?
        """, rs -> {
      var map = new java.util.HashMap<String, Long>();
      while (rs.next()) map.put(rs.getString(1), rs.getLong(2));
      return map;
    }, tenant, instance, order.orderNo());
    var remaining = new HashSet<>(existing.keySet());
    for (var item : order.items()) {
      long productId = Objects.requireNonNull(productIds.get(item.productCode()), "Missing validated product mapping");
      Long id = existing.get(item.lineId());
      if (id == null) {
        id = ids.nextId("biz_purchase_plan");
        db.update("""
            INSERT INTO biz_purchase_plan(id,tenant_id,plan_no,product_id,plan_qty,unit_price,status,
              spd_instance_id,spd_order_no,spd_line_id,spd_order_date,spd_order_status,spd_supplier_code,
              spd_unit,spd_amount,spd_currency,spd_tax_included)
            VALUES(?,?,?,?,?,?,6,?,?,?,?,?,?,?,?,?,?)
            """, id, tenant, "SPD-PLAN-" + id, productId, item.quantity(), item.unitPrice(),
            instance, order.orderNo(), item.lineId(), Date.valueOf(order.orderDate()), order.status(),
            order.supplierCode(), item.unit(), item.amount(), order.currency(), order.taxIncluded());
      } else {
        db.update("""
            UPDATE biz_purchase_plan SET product_id=?,plan_qty=?,unit_price=?,spd_order_date=?,
              spd_order_status=?,spd_supplier_code=?,spd_unit=?,spd_amount=?,spd_currency=?,
              spd_tax_included=?,deleted=0 WHERE tenant_id=? AND id=?
            """, productId, item.quantity(), item.unitPrice(), Date.valueOf(order.orderDate()),
            order.status(), order.supplierCode(), item.unit(), item.amount(), order.currency(),
            order.taxIncluded(), tenant, id);
      }
      remaining.remove(item.lineId());
    }
    remaining.forEach(line -> db.update("UPDATE biz_purchase_plan SET deleted=1 WHERE tenant_id=? AND id=?",
        tenant, existing.get(line)));
  }

  static void validatePrecision(OrderRequest order) {
    for (var item : order.items()) {
      checkPrecision(item.quantity(), 18);
      checkPrecision(item.unitPrice(), 18);
      checkPrecision(item.amount(), 20);
    }
  }

  private static void checkPrecision(BigDecimal value, int precision) {
    BigDecimal normalized = value.stripTrailingZeros();
    if (normalized.scale() > 4 || normalized.precision() - normalized.scale() > precision - 4)
      throw new BusinessException("PLAN_PRECISION_INVALID", "订单明细的数量、单价或金额超出采购计划字段精度");
  }

  @Override
  public void run(ApplicationArguments args) {
    var sources = db.query("""
        SELECT r.tenant_id,r.instance_id,r.source_code FROM spd_record r
        WHERE r.kind='order' AND NOT EXISTS (
          SELECT 1 FROM biz_purchase_plan p WHERE p.tenant_id=r.tenant_id
            AND p.spd_instance_id=r.instance_id AND p.spd_order_no=r.source_code)
        """, (rs, i) -> new Source(rs.getLong(1), rs.getString(2), rs.getString(3)));
    for (var source : sources) {
      try {
        transactions.executeWithoutResult(status -> {
          repo.instance(source.tenant(), source.instance(), true);
          var record = repo.record(source.tenant(), source.instance(), "order", source.order()).orElseThrow();
          try {
            var order = mapper.treeToValue(record.payload(), OrderRequest.class);
            validatePrecision(order);
            var productIds = new HashMap<String,Long>();
            for (var item : order.items()) {
              productIds.computeIfAbsent(item.productCode(), code -> repo.mappedProduct(source.tenant(), source.instance(), code)
                  .orElseThrow(() -> new BusinessException("PRODUCT_UNMAPPED", "商品未匹配: " + code)));
            }
            sync(source.tenant(), source.instance(), order, productIds);
          } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("历史订单格式不合法", e);
          }
        });
      } catch (RuntimeException e) {
        log.warn("历史SPD-PR订单无法投影到采购计划：实例={}，订单={}，异常类型={}",
            source.instance(), source.order(), e.getClass().getSimpleName());
      }
    }
  }
}
