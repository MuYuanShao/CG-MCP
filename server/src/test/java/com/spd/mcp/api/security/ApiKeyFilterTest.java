package com.spd.mcp.api.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiKeyFilterTest {
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void rejectsProtectedApiRequestWithoutApiKey() throws Exception {
    ApiKeyFilter filter = new ApiKeyFilter(objectMapper, "secret");
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, noopChain());

    assertThat(response.getStatus()).isEqualTo(401);
    assertThat(response.getContentAsString()).contains("API_KEY_INVALID");
  }

  @Test
  void allowsProtectedApiRequestWithApiKey() throws Exception {
    ApiKeyFilter filter = new ApiKeyFilter(objectMapper, "secret");
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
    request.addHeader("x-api-key", "secret");
    MockHttpServletResponse response = new MockHttpServletResponse();
    boolean[] invoked = {false};

    filter.doFilter(request, response, (servletRequest, servletResponse) -> invoked[0] = true);

    assertThat(invoked[0]).isTrue();
    assertThat(response.getStatus()).isEqualTo(200);
  }

  @Test
  void skipsHealthEndpoint() throws Exception {
    ApiKeyFilter filter = new ApiKeyFilter(objectMapper, "secret");
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/health");
    MockHttpServletResponse response = new MockHttpServletResponse();
    boolean[] invoked = {false};

    filter.doFilter(request, response, (servletRequest, servletResponse) -> invoked[0] = true);

    assertThat(invoked[0]).isTrue();
  }

  private FilterChain noopChain() {
    return (servletRequest, servletResponse) -> { };
  }
}
