package com.spd.mcp.api.tenant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class TenantContextFilter extends OncePerRequestFilter {
  private static final String TENANT_ID_HEADER = "x-tenant-id";
  private final TenantContext tenantContext;
  private final ObjectMapper objectMapper;

  public TenantContextFilter(TenantContext tenantContext, ObjectMapper objectMapper) {
    this.tenantContext = tenantContext;
    this.objectMapper = objectMapper;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    String tenantIdHeader = request.getHeader(TENANT_ID_HEADER);
    if (StringUtils.hasText(tenantIdHeader)) {
      try {
        long tenantId = Long.parseLong(tenantIdHeader);
        if (tenantId <= 0) {
          writeBadRequest(response);
          return;
        }
        tenantContext.setTenantId(tenantId);
      } catch (NumberFormatException exception) {
        writeBadRequest(response);
        return;
      }
    }

    try {
      filterChain.doFilter(request, response);
    } finally {
      tenantContext.clear();
    }
  }

  private void writeBadRequest(HttpServletResponse response) throws IOException {
    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.error("TENANT_ID_INVALID", "租户 ID 不合法")));
  }
}
