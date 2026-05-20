package com.spd.mcp.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.tenant.TenantContext;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthFilterTest {
  @Test
  void rejectsTokenFromDifferentTenant() throws Exception {
    AuthTokenService tokenService = new AuthTokenService("secret", 3600, 604800);
    AuthContext authContext = new AuthContext();
    AuthFilter filter = new AuthFilter(tokenService, authContext, new TenantContext(2L), new ObjectMapper());
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/refunds");
    request.addHeader("Authorization", "Bearer " + tokenService.issue(1L, "root", "admin", Set.of("refunds:create")));
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, new MockFilterChain());

    assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
    assertThat(response.getContentAsString()).contains("TENANT_MISMATCH");
    assertThat(authContext.currentUser()).isEmpty();
  }
}
