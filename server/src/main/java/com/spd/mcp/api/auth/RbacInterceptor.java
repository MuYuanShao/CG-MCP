package com.spd.mcp.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class RbacInterceptor implements HandlerInterceptor {
  private final AuthContext authContext;
  private final ObjectMapper objectMapper;

  public RbacInterceptor(AuthContext authContext, ObjectMapper objectMapper) {
    this.authContext = authContext;
    this.objectMapper = objectMapper;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
    if (!(handler instanceof HandlerMethod handlerMethod)) {
      return true;
    }
    RequirePermission permission = handlerMethod.getMethodAnnotation(RequirePermission.class);
    if (permission == null) {
      permission = handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
    }
    if (permission == null) {
      return true;
    }
    String requiredPermission = permission.value();
    boolean allowed = authContext.currentUser()
        .map(user -> user.permissions().contains(requiredPermission))
        .orElse(false);
    if (allowed) {
      return true;
    }
    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.error("PERMISSION_DENIED", "无操作权限")));
    return false;
  }
}
