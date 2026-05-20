package com.spd.mcp.api.auth;

import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;
  private final AuthContext authContext;
  private final String refreshCookieName;
  private final long refreshCookieMaxAgeSeconds;
  private final boolean refreshCookieSecure;
  private final String refreshCookieSameSite;

  public AuthController(
      AuthService authService,
      AuthContext authContext,
      @Value("${app.auth.refresh-cookie-name:spd_refresh_token}") String refreshCookieName,
      @Value("${app.auth.refresh-token-ttl-seconds:604800}") long refreshCookieMaxAgeSeconds,
      @Value("${app.auth.refresh-cookie-secure:false}") boolean refreshCookieSecure,
      @Value("${app.auth.refresh-cookie-same-site:Lax}") String refreshCookieSameSite) {
    this.authService = authService;
    this.authContext = authContext;
    this.refreshCookieName = Objects.requireNonNull(refreshCookieName);
    this.refreshCookieMaxAgeSeconds = refreshCookieMaxAgeSeconds;
    this.refreshCookieSecure = refreshCookieSecure;
    this.refreshCookieSameSite = Objects.requireNonNull(refreshCookieSameSite);
  }

  @PostMapping("/login")
  public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    AuthSession session = authService.login(request);
    setRefreshCookie(response, session.refreshToken());
    return ApiResponse.success(session.response());
  }

  @PostMapping("/refresh")
  public ApiResponse<LoginResponse> refresh(
      @RequestBody(required = false) RefreshRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    AuthSession session = authService.refresh(resolveRefreshToken(httpRequest, request == null ? null : request.refreshToken()));
    setRefreshCookie(httpResponse, session.refreshToken());
    return ApiResponse.success(session.response());
  }

  @PostMapping("/logout")
  public ApiResponse<Void> logout(
      @RequestBody(required = false) LogoutRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    String refreshToken = resolveOptionalRefreshToken(httpRequest, request == null ? null : request.refreshToken());
    if (StringUtils.hasText(refreshToken)) {
      authService.logout(refreshToken);
    }
    clearRefreshCookie(httpResponse);
    return ApiResponse.success(null);
  }

  @GetMapping("/me")
  public ApiResponse<AuthenticatedUser> me() {
    return ApiResponse.success(authContext.currentUser()
        .orElseThrow(() -> new BusinessException("TOKEN_MISSING", "请先登录", HttpStatus.UNAUTHORIZED)));
  }

  private String resolveRefreshToken(HttpServletRequest request, String bodyRefreshToken) {
    String refreshToken = resolveOptionalRefreshToken(request, bodyRefreshToken);
    if (!StringUtils.hasText(refreshToken)) {
      throw new BusinessException("TOKEN_INVALID", "刷新凭证无效", HttpStatus.UNAUTHORIZED);
    }
    return refreshToken;
  }

  private String resolveOptionalRefreshToken(HttpServletRequest request, String bodyRefreshToken) {
    String cookieRefreshToken = refreshTokenFromCookie(request);
    return StringUtils.hasText(cookieRefreshToken) ? cookieRefreshToken : bodyRefreshToken;
  }

  private String refreshTokenFromCookie(HttpServletRequest request) {
    if (request.getCookies() == null) {
      return null;
    }
    for (var cookie : request.getCookies()) {
      if (refreshCookieName.equals(cookie.getName())) {
        return cookie.getValue();
      }
    }
    return null;
  }

  private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
    response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(refreshToken, refreshCookieMaxAgeSeconds).toString());
  }

  private void clearRefreshCookie(HttpServletResponse response) {
    response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", 0).toString());
  }

  @SuppressWarnings("null")
  private ResponseCookie refreshCookie(String value, long maxAgeSeconds) {
    String cookieValue = Objects.requireNonNull(value);
    Duration maxAge = Objects.requireNonNull(Duration.ofSeconds(maxAgeSeconds));
    return ResponseCookie.from(refreshCookieName, cookieValue)
        .httpOnly(true)
        .secure(refreshCookieSecure)
        .sameSite(refreshCookieSameSite)
        .path("/api/auth")
        .maxAge(maxAge)
        .build();
  }
}
