package com.spd.mcp.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.spd.mcp.api.common.BusinessException;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AuthTokenServiceTest {
  @Test
  void issuesAndVerifiesSignedToken() {
    AuthTokenService service = new AuthTokenService("secret", 3600, 604800);

    String token = service.issue(1L, "admin", "admin", Set.of("refunds:create"));
    AuthenticatedUser user = service.verify(token);

    assertThat(user.username()).isEqualTo("admin");
    assertThat(user.tenantId()).isEqualTo(1L);
    assertThat(user.role()).isEqualTo("admin");
    assertThat(user.permissions()).contains("refunds:create");
  }

  @Test
  void rejectsTamperedToken() {
    AuthTokenService service = new AuthTokenService("secret", 3600, 604800);
    String token = service.issue(1L, "admin", "admin", Set.of("refunds:create"));

    assertThatThrownBy(() -> service.verify(token + "x"))
        .isInstanceOf(BusinessException.class)
        .hasMessage("登录凭证无效");
  }

  @Test
  void rejectsMalformedTokenAsBusinessError() {
    AuthTokenService service = new AuthTokenService("secret", 3600, 604800);

    assertThatThrownBy(() -> service.verify("not-base64.signature"))
        .isInstanceOf(BusinessException.class)
        .hasMessage("登录凭证无效");
  }
}
