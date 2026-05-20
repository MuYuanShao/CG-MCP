package com.spd.mcp.api.auth;

import com.spd.mcp.api.common.BusinessException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;
import java.util.TreeSet;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AuthTokenService {
  private static final String HMAC_ALGORITHM = "HmacSHA256";
  private final String secret;
  private final long ttlSeconds;
  private final long refreshTtlSeconds;

  public AuthTokenService(
      @Value("${app.auth.token-secret:${APP_API_KEY:}}") String secret,
      @Value("${app.auth.token-ttl-seconds:1800}") long ttlSeconds,
      @Value("${app.auth.refresh-token-ttl-seconds:604800}") long refreshTtlSeconds) {
    this.secret = secret;
    this.ttlSeconds = ttlSeconds;
    this.refreshTtlSeconds = refreshTtlSeconds;
  }

  public String issue(long tenantId, String username, String role, Set<String> permissions) {
    long expiresAt = Instant.now().getEpochSecond() + ttlSeconds;
    String permissionText = String.join(",", new TreeSet<>(permissions));
    String payload = tenantId + ":" + encode(username) + ":" + encode(role) + ":" + encode(permissionText) + ":" + expiresAt;
    return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + sign(payload);
  }

  public AuthenticatedUser verify(String token) {
    if (!StringUtils.hasText(secret)) {
      throw new BusinessException("AUTH_NOT_CONFIGURED", "认证密钥未配置", HttpStatus.UNAUTHORIZED);
    }
    String[] parts = token.split("\\.", 2);
    if (parts.length != 2) {
      throw invalidToken();
    }
    try {
      String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
      if (!sign(payload).equals(parts[1])) {
        throw invalidToken();
      }
      String[] fields = payload.split(":", 5);
      if (fields.length != 5) {
        throw invalidToken();
      }
      long tenantId = Long.parseLong(fields[0]);
      long expiresAt = Long.parseLong(fields[4]);
      if (expiresAt < Instant.now().getEpochSecond()) {
        throw new BusinessException("TOKEN_EXPIRED", "登录凭证已过期", HttpStatus.UNAUTHORIZED);
      }
      String permissions = decode(fields[3]);
      return new AuthenticatedUser(
          tenantId,
          decode(fields[1]),
          decode(fields[2]),
          permissions.isBlank() ? Set.of() : Set.of(permissions.split(",")));
    } catch (IllegalArgumentException exception) {
      throw invalidToken();
    }
  }

  public long refreshTtlSeconds() {
    return refreshTtlSeconds;
  }

  private String sign(String payload) {
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to sign auth token", exception);
    }
  }

  private BusinessException invalidToken() {
    return new BusinessException("TOKEN_INVALID", "登录凭证无效", HttpStatus.UNAUTHORIZED);
  }

  private String encode(String value) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
  }

  private String decode(String value) {
    return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
  }
}
