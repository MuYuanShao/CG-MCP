package com.spd.mcp.api.auth;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final AuthTokenService tokenService;
  private final AuthRepository authRepository;
  private final SessionRepository sessionRepository;
  private final PasswordHasher passwordHasher;
  private final TenantContext tenantContext;
  private final DbIdGenerator idGenerator;
  private final SecureRandom secureRandom = new SecureRandom();

  public AuthService(
      AuthTokenService tokenService,
      AuthRepository authRepository,
      SessionRepository sessionRepository,
      PasswordHasher passwordHasher,
      TenantContext tenantContext,
      DbIdGenerator idGenerator) {
    this.tokenService = tokenService;
    this.authRepository = authRepository;
    this.sessionRepository = sessionRepository;
    this.passwordHasher = passwordHasher;
    this.tenantContext = tenantContext;
    this.idGenerator = idGenerator;
  }

  @Transactional
  public AuthSession login(LoginRequest request) {
    long tenantId = tenantContext.currentTenantId();
    UserAccount user = authRepository.findActiveUser(tenantId, request.username())
        .orElseThrow(() -> new BusinessException("LOGIN_FAILED", "用户名或密码错误", HttpStatus.UNAUTHORIZED));
    if (!passwordHasher.matches(request.password(), user.passwordHash())) {
      throw new BusinessException("LOGIN_FAILED", "用户名或密码错误", HttpStatus.UNAUTHORIZED);
    }
    return issueSession(tenantId, user);
  }

  @Transactional
  public AuthSession refresh(String refreshToken) {
    long tenantId = tenantContext.currentTenantId();
    String refreshTokenHash = hashToken(refreshToken);
    long userId = sessionRepository.consumeActiveUserId(tenantId, refreshTokenHash)
        .orElseThrow(() -> new BusinessException("TOKEN_INVALID", "刷新凭证无效", HttpStatus.UNAUTHORIZED));
    UserAccount user = authRepository.findActiveUserById(tenantId, userId)
        .orElseThrow(() -> new BusinessException("TOKEN_INVALID", "刷新凭证无效", HttpStatus.UNAUTHORIZED));
    return issueSession(tenantId, user);
  }

  @Transactional
  public void logout(String refreshToken) {
    sessionRepository.revoke(tenantContext.currentTenantId(), hashToken(refreshToken));
  }

  private AuthSession issueSession(long tenantId, UserAccount user) {
    Set<String> permissions = authRepository.findPermissions(tenantId, user.id());
    String accessToken = tokenService.issue(tenantId, user.username(), user.role(), permissions);
    String refreshToken = newRefreshToken();
    sessionRepository.create(
        idGenerator.nextId("sys_user_session"),
        tenantId,
        user.id(),
        hashToken(refreshToken),
        Instant.now().plusSeconds(tokenService.refreshTtlSeconds()));
    return new AuthSession(new LoginResponse(accessToken, user.username(), user.role(), permissions), refreshToken);
  }

  private String newRefreshToken() {
    byte[] bytes = new byte[32];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  String hashToken(String token) {
    try {
      return Base64.getUrlEncoder().withoutPadding().encodeToString(
          MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to hash token", exception);
    }
  }
}
