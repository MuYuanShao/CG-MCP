package com.spd.mcp.api.tenant;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class TenantContextFilterTest {
  private final TenantContext tenantContext = new TenantContext(1L);
  private final TenantContextFilter filter = new TenantContextFilter(tenantContext, new ObjectMapper());

  @Test
  void usesDefaultTenantWhenHeaderIsMissing() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
    MockHttpServletResponse response = new MockHttpServletResponse();
    long[] tenantId = {0L};

    filter.doFilter(request, response, (servletRequest, servletResponse) -> tenantId[0] = tenantContext.currentTenantId());

    assertThat(response.getStatus()).isEqualTo(200);
    assertThat(tenantId[0]).isEqualTo(1L);
    assertThat(tenantContext.currentTenantId()).isEqualTo(1L);
  }

  @Test
  void setsTenantFromHeaderForCurrentRequest() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
    request.addHeader("x-tenant-id", "2");
    MockHttpServletResponse response = new MockHttpServletResponse();
    long[] tenantId = {0L};

    filter.doFilter(request, response, (servletRequest, servletResponse) -> tenantId[0] = tenantContext.currentTenantId());

    assertThat(response.getStatus()).isEqualTo(200);
    assertThat(tenantId[0]).isEqualTo(2L);
    assertThat(tenantContext.currentTenantId()).isEqualTo(1L);
  }

  @Test
  void rejectsInvalidTenantHeader() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
    request.addHeader("x-tenant-id", "invalid");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (servletRequest, servletResponse) -> { });

    assertThat(response.getStatus()).isEqualTo(400);
    assertThat(response.getContentAsString()).contains("TENANT_ID_INVALID");
  }
}
