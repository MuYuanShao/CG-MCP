package com.spd.mcp.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.BusinessException;
import jakarta.servlet.http.Cookie;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {
  @Mock
  private AuthService authService;
  private final AuthContext authContext = new AuthContext();

  @Test
  void loginSetsHttpOnlyRefreshCookieAndDoesNotExposeRefreshToken() {
    AuthController controller = controller();
    LoginRequest request = new LoginRequest("root", "password");
    when(authService.login(request))
        .thenReturn(new AuthSession(new LoginResponse("access-token", "root", "admin", Set.of("refunds:create")), "refresh-token"));
    MockHttpServletResponse response = new MockHttpServletResponse();

    ApiResponse<LoginResponse> result = controller.login(request, response);

    assertThat(result.data().token()).isEqualTo("access-token");
    assertThat(response.getHeader(HttpHeaders.SET_COOKIE))
        .contains("root=refresh-token")
        .contains("HttpOnly")
        .contains("Path=/api/auth")
        .contains("SameSite=Lax");
  }

  @Test
  void refreshPrefersCookieTokenAndRotatesCookie() {
    AuthController controller = controller();
    when(authService.refresh("cookie-refresh"))
        .thenReturn(new AuthSession(new LoginResponse("new-access-token", "root", "admin", Set.of()), "new-refresh-token"));
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setCookies(new Cookie("root", "cookie-refresh"));
    MockHttpServletResponse response = new MockHttpServletResponse();

    ApiResponse<LoginResponse> result = controller.refresh(new RefreshRequest("body-refresh"), request, response);

    assertThat(result.data().token()).isEqualTo("new-access-token");
    assertThat(response.getHeader(HttpHeaders.SET_COOKIE)).contains("root=new-refresh-token");
    verify(authService).refresh("cookie-refresh");
  }

  @Test
  void refreshFallsBackToBodyTokenWhenCookieIsMissing() {
    AuthController controller = controller();
    when(authService.refresh("body-refresh"))
        .thenReturn(new AuthSession(new LoginResponse("new-access-token", "root", "admin", Set.of()), "new-refresh-token"));
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    ApiResponse<LoginResponse> result = controller.refresh(new RefreshRequest("body-refresh"), request, response);

    assertThat(result.data().token()).isEqualTo("new-access-token");
    assertThat(response.getHeader(HttpHeaders.SET_COOKIE)).contains("root=new-refresh-token");
    verify(authService).refresh("body-refresh");
  }

  @Test
  void refreshRejectsMissingRefreshToken() {
    AuthController controller = controller();

    assertThatThrownBy(() -> controller.refresh(null, new MockHttpServletRequest(), new MockHttpServletResponse()))
        .isInstanceOf(BusinessException.class)
        .satisfies(exception -> assertThat(((BusinessException) exception).getCode()).isEqualTo("TOKEN_INVALID"));
  }

  @Test
  void loginHonorsSecureSameSiteNoneCookieConfig() {
    AuthController controller = new AuthController(authService, authContext, "root", 604800L, true, "None");
    LoginRequest request = new LoginRequest("root", "password");
    when(authService.login(request))
        .thenReturn(new AuthSession(new LoginResponse("access-token", "root", "admin", Set.of()), "refresh-token"));
    MockHttpServletResponse response = new MockHttpServletResponse();

    controller.login(request, response);

    assertThat(response.getHeader(HttpHeaders.SET_COOKIE))
        .contains("root=refresh-token")
        .contains("Secure")
        .contains("SameSite=None");
  }

  @Test
  void logoutRevokesRefreshCookieAndClearsCookie() {
    AuthController controller = controller();
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setCookies(new Cookie("root", "cookie-refresh"));
    MockHttpServletResponse response = new MockHttpServletResponse();

    ApiResponse<Void> result = controller.logout(null, request, response);

    assertThat(result.code()).isEqualTo("SUCCESS");
    assertThat(response.getHeader(HttpHeaders.SET_COOKIE))
        .contains("root=")
        .contains("Max-Age=0")
        .contains("HttpOnly");
    verify(authService).logout("cookie-refresh");
  }

  private AuthController controller() {
    return new AuthController(authService, authContext, "root", 604800L, false, "Lax");
  }
}
