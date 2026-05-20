package com.spd.mcp.api.operation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/operation-logs")
public class FrontendOperationController {
  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;
  private final TenantContext tenantContext;
  private final String defaultOperatorName;

  public FrontendOperationController(
      JdbcTemplate jdbcTemplate,
      ObjectMapper objectMapper,
      TenantContext tenantContext,
      @Value("${app.audit.default-operator-name}") String defaultOperatorName) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
    this.tenantContext = tenantContext;
    this.defaultOperatorName = defaultOperatorName;
  }

  @PostMapping
  public ApiResponse<Map<String, Object>> record(
      @Valid @RequestBody FrontendOperationRequest request,
      HttpServletRequest httpRequest
  ) throws JsonProcessingException {
    String details = request.details() == null ? null : objectMapper.writeValueAsString(request.details());
    String userAgent = httpRequest.getHeader("User-Agent");

    jdbcTemplate.update("""
        INSERT INTO biz_frontend_operation_log (
          tenant_id, module_code, action_code, message, business_id, details, operator_name, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        tenantContext.currentTenantId(),
        request.moduleCode(),
        request.actionCode(),
        request.message(),
        request.businessId(),
        details,
        defaultOperatorName,
        userAgent);

    return ApiResponse.success(Map.of("saved", true));
  }
}
