package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.PageResult;
import com.spd.mcp.api.tenant.TenantContext;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Keeps order intake failures queryable alongside their bounded, business-only request parameters. */
@Service
public class OrderReceiveLogService {
  private static final Logger LOGGER = LoggerFactory.getLogger(OrderReceiveLogService.class);
  private static final String FILTER = """
      FROM spd_sync_log WHERE tenant_id=? AND instance_id=? AND direction='upload'
        AND kind='order' AND state IN ('failed','request_failed','retried')
      """;
  private static final List<String> ORDER_FIELDS = List.of("orderNo","supplierCode","orderDate","status",
      "totalAmount","currency","taxIncluded","sourceUpdatedAt","sourcePlanId","sourcePlanNo");
  private static final List<String> ITEM_FIELDS = List.of("lineId","productCode","quantity","unit","unitPrice","amount");
  private final JdbcTemplate db;
  private final IntegrationRepository repo;
  private final TenantContext tenant;
  private final ObjectMapper mapper;

  public OrderReceiveLogService(JdbcTemplate db, IntegrationRepository repo, TenantContext tenant, ObjectMapper mapper) {
    this.db = db;
    this.repo = repo;
    this.tenant = tenant;
    this.mapper = mapper;
  }

  public record Entry(String id, String orderNo, String state, String reason, String failureCode,
      Integer httpStatus, String createdTime, String retryResult) {}
  public record Detail(Entry log, JsonNode parameters, String parametersJson) {}

  public void recordRejected(String instance, JsonNode request, int status, String code, String reason) {
    long tenantId = tenant.currentTenantId();
    try {
      repo.instance(tenantId, instance, false);
      var params = businessFields(request);
      String order = limit(params.path("orderNo").asText(""), 100);
      String message = limit(reason, 1000);
      String serialized = repo.json(params);
      db.update("""
          INSERT INTO spd_sync_log(id,tenant_id,instance_id,batch_id,direction,kind,source_code,state,message,
            payload,payload_exact,failure_message,failure_code,http_status)
          VALUES(?,?,?,?,'upload','order',?,'request_failed',?,?,?,?,?,?)
          """, UUID.randomUUID().toString(), tenantId, instance, UUID.randomUUID().toString(),
          order, message, serialized, serialized, message, code, status);
    } catch (RuntimeException failure) {
      LOGGER.warn("Unable to record rejected order intake (reason code: {}, type: {})",
          code, failure.getClass().getSimpleName());
    }
  }

  public PageResult<Entry> failures(String instance, String orderNo, int page, int size) {
    long tenantId = tenant.currentTenantId();
    repo.instance(tenantId, instance, false);
    if (page < 1 || size < 1 || size > 100 || orderNo.length() > 100)
      throw new BusinessException("LOG_QUERY_INVALID", "订单号或分页参数不合法");
    String where = FILTER + " AND LOCATE(?,source_code)>0";
    String query = orderNo.trim();
    Long total = db.queryForObject("SELECT COUNT(*) " + where, Long.class, tenantId, instance, query);
    var rows = db.query("""
        SELECT id,source_code,state,message,failure_message,failure_code,http_status,created_time
        """ + where + " ORDER BY created_time DESC,id DESC LIMIT ? OFFSET ?",
        (rs, n) -> entry(rs), tenantId, instance, query, size, (long)(page - 1) * size);
    return new PageResult<>(rows, total == null ? 0 : total, page, size);
  }

  public Detail detail(String instance, String logId) {
    long tenantId = tenant.currentTenantId();
    repo.instance(tenantId, instance, false);
    return db.query("SELECT * " + FILTER + " AND id=?", (rs, n) -> {
      var exact = rs.getString("payload_exact");
      var parameters = businessFields(repo.parse(exact == null ? rs.getString("payload") : exact));
      return new Detail(entry(rs), parameters, parameters.toPrettyString());
    },
        tenantId, instance, logId).stream().findFirst()
        .orElseThrow(() -> new BusinessException("LOG_NOT_FOUND", "接收采购计划失败日志不存在",
            org.springframework.http.HttpStatus.NOT_FOUND));
  }

  private Entry entry(ResultSet rs) throws SQLException {
    String state = rs.getString("state");
    String message = rs.getString("message");
    String reason = rs.getString("failure_message");
    Integer status = rs.getObject("http_status", Integer.class);
    if (reason == null) reason = "retried".equals(state) ? "历史重试记录未保留原失败原因" : message;
    return new Entry(rs.getString("id"), rs.getString("source_code"), state, reason,
        rs.getString("failure_code"), status != null ? status : 200, rs.getString("created_time"),
        "retried".equals(state) ? message : null);
  }

  private ObjectNode businessFields(JsonNode source) {
    var target = mapper.createObjectNode();
    if (source == null || !source.isObject()) return target;
    copyScalars(source, target, ORDER_FIELDS);
    if (source.path("items").isArray()) {
      var items = target.putArray("items");
      for (JsonNode item : source.path("items")) {
        if (items.size() == 1000) break;
        copyScalars(item, items.addObject(), ITEM_FIELDS);
      }
      if (source.path("items").size() > items.size()) target.put("itemsTruncated", true);
    }
    if (source.path("itemsTruncated").asBoolean(false)) target.put("itemsTruncated", true);
    return target;
  }

  private void copyScalars(JsonNode source, ObjectNode target, List<String> fields) {
    for (String field : fields) {
      JsonNode value = source.get(field);
      if (value == null) continue;
      if (value.isTextual()) target.put(field, limit(value.textValue(), 200));
      else if (value.isNumber() || value.isBoolean() || value.isNull()) target.set(field, value);
    }
  }

  private static String limit(String value, int max) {
    return value == null ? "" : value.substring(0, Math.min(value.length(), max));
  }
}
