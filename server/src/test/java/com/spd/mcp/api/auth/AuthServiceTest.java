package com.spd.mcp.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
  @Mock
  private AuthRepository authRepository;
  @Mock
  private SessionRepository sessionRepository;
  @Mock
  private DbIdGenerator idGenerator;

  private final PasswordHasher passwordHasher = new PasswordHasher();
  private final TenantContext tenantContext = new TenantContext(1L);

  @Test
  void loginReturnsAdminPermissions() {
    AuthService service = service();
    String passwordHash = passwordHasher.hash("password");
    when(authRepository.findActiveUser(1L, "root"))
        .thenReturn(Optional.of(new UserAccount(1L, 1L, "root", passwordHash, "root", "admin")));
    when(authRepository.findPermissions(1L, 1L)).thenReturn(Set.of("refunds:create", "purchaseOrders:confirm"));
    when(idGenerator.nextId("sys_user_session")).thenReturn(100L);

    AuthSession session = service.login(new LoginRequest("root", "password"));
    LoginResponse response = session.response();

    assertThat(response.token()).isNotBlank();
    assertThat(session.refreshToken()).isNotBlank();
    assertThat(response.permissions()).contains("refunds:create", "purchaseOrders:confirm");
    verify(sessionRepository).create(eq(100L), eq(1L), eq(1L), any(), any());
  }

  @Test
  void loginRejectsInvalidPassword() {
    AuthService service = service();
    String passwordHash = passwordHasher.hash("password");
    when(authRepository.findActiveUser(1L, "root"))
        .thenReturn(Optional.of(new UserAccount(1L, 1L, "root", passwordHash, "root", "admin")));

    assertThatThrownBy(() -> service.login(new LoginRequest("root", "bad")))
        .isInstanceOf(BusinessException.class)
        .hasMessage("用户名或密码错误");
  }

  private AuthService service() {
    return new AuthService(
        new AuthTokenService("secret", 3600, 604800),
        authRepository,
        sessionRepository,
        passwordHasher,
        tenantContext,
        idGenerator);
  }
}
