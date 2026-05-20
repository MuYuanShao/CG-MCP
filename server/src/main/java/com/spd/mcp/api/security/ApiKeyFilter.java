package com.spd.mcp.api.security;

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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiKeyFilter extends OncePerRequestFilter {
  private static final String API_KEY_HEADER = "x-api-key";
  private final ObjectMapper objectMapper;
  private final String apiKey;

  public ApiKeyFilter(ObjectMapper objectMapper, @Value("${app.api.key:}") String apiKey) {
    this.objectMapper = objectMapper;
    this.apiKey = apiKey;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !path.startsWith("/api/")
        || "OPTIONS".equalsIgnoreCase(request.getMethod())
        || path.equals("/api/health")
        || path.startsWith("/actuator")
        || path.startsWith("/api-docs")
        || path.startsWith("/swagger-ui");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    if (!StringUtils.hasText(apiKey)) {
      writeUnauthorized(response, "API_KEY_NOT_CONFIGURED", "API 访问密钥未配置");
      return;
    }

    String requestApiKey = request.getHeader(API_KEY_HEADER);
    if (!apiKey.equals(requestApiKey)) {
      writeUnauthorized(response, "API_KEY_INVALID", "API 访问密钥无效");
      return;
    }

    filterChain.doFilter(request, response);
  }

  private void writeUnauthorized(HttpServletResponse response, String code, String message) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.error(code, message)));
  }
}
