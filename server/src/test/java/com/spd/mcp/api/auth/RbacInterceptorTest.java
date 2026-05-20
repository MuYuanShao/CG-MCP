package com.spd.mcp.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

class RbacInterceptorTest {
  private final AuthContext authContext = new AuthContext();
  private final RbacInterceptor interceptor = new RbacInterceptor(authContext, new ObjectMapper());

  @Test
  void allowsUserWithRequiredPermission() throws Exception {
    authContext.setCurrentUser(new AuthenticatedUser(1L, "admin", "admin", Set.of("refunds:create")));
    HandlerMethod handler = new HandlerMethod(new ProtectedHandler(), "createRefund");

    boolean allowed = interceptor.preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), handler);

    assertThat(allowed).isTrue();
    authContext.clear();
  }

  @Test
  void rejectsUserWithoutRequiredPermission() throws Exception {
    authContext.setCurrentUser(new AuthenticatedUser(1L, "user", "viewer", Set.of()));
    HandlerMethod handler = new HandlerMethod(new ProtectedHandler(), "createRefund");
    MockHttpServletResponse response = new MockHttpServletResponse();

    boolean allowed = interceptor.preHandle(new MockHttpServletRequest(), response, handler);

    assertThat(allowed).isFalse();
    assertThat(response.getStatus()).isEqualTo(403);
    assertThat(response.getContentAsString()).contains("PERMISSION_DENIED");
    authContext.clear();
  }

  static class ProtectedHandler {
    @RequirePermission("refunds:create")
    public void createRefund() {}
  }
}
