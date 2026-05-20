package com.spd.mcp.api.auth;

import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class AuthContext {
  private static final ThreadLocal<AuthenticatedUser> CURRENT_USER = new ThreadLocal<>();

  public Optional<AuthenticatedUser> currentUser() {
    return Optional.ofNullable(CURRENT_USER.get());
  }

  void setCurrentUser(AuthenticatedUser user) {
    CURRENT_USER.set(user);
  }

  void clear() {
    CURRENT_USER.remove();
  }
}
