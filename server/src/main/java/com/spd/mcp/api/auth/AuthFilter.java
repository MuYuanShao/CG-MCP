package com.spd.mcp.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.tenant.TenantContext;
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
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class AuthFilter extends OncePerRequestFilter {
  private final AuthTokenService tokenService;
  private final AuthContext authContext;
  private final TenantContext tenantContext;
  private final ObjectMapper objectMapper;

  public AuthFilter(AuthTokenService tokenService, AuthContext authContext, TenantContext tenantContext, ObjectMapper objectMapper) {
    this.tokenService = tokenService;
    this.authContext = authContext;
    this.tenantContext = tenantContext;
    this.objectMapper = objectMapper;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !path.startsWith("/api/")
        || "OPTIONS".equalsIgnoreCase(request.getMethod())
        || path.equals("/api/health")
        || path.equals("/api/auth/login")
        || path.equals("/api/auth/refresh")
        || path.equals("/api/auth/logout")
        || path.startsWith("/actuator")
        || path.startsWith("/api-docs")
        || path.startsWith("/swagger-ui");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    String authorization = request.getHeader("Authorization");
    if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
      writeUnauthorized(response, "TOKEN_MISSING", "请先登录");
      return;
    }
    try {
      AuthenticatedUser user = tokenService.verify(authorization.substring(7));
      if (!user.tenantId().equals(tenantContext.currentTenantId())) {
        writeUnauthorized(response, "TENANT_MISMATCH", "租户上下文不匹配");
        return;
      }
      authContext.setCurrentUser(user);
      filterChain.doFilter(request, response);
    } catch (BusinessException exception) {
      writeUnauthorized(response, exception.getCode(), exception.getMessage());
    } finally {
      authContext.clear();
    }
  }

  private void writeUnauthorized(HttpServletResponse response, String code, String message) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.error(code, message)));
  }
}
