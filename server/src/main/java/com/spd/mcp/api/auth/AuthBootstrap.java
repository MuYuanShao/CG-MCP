package com.spd.mcp.api.auth;

import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
public class AuthBootstrap implements ApplicationRunner {
  private final AuthRepository authRepository;
  private final PasswordHasher passwordHasher;
  private final DbIdGenerator idGenerator;
  private final TenantContext tenantContext;
  private final String adminUsername;
  private final String adminPassword;
  private final boolean resetPassword;

  public AuthBootstrap(
      AuthRepository authRepository,
      PasswordHasher passwordHasher,
      DbIdGenerator idGenerator,
      TenantContext tenantContext,
      @Value("${app.auth.admin-username:root}") String adminUsername,
      @Value("${app.auth.admin-password:}") String adminPassword,
      @Value("${app.auth.bootstrap-reset-password:false}") boolean resetPassword) {
    this.authRepository = authRepository;
    this.passwordHasher = passwordHasher;
    this.idGenerator = idGenerator;
    this.tenantContext = tenantContext;
    this.adminUsername = adminUsername;
    this.adminPassword = adminPassword;
    this.resetPassword = resetPassword;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (!StringUtils.hasText(adminPassword)) return;
    long tenantId = tenantContext.currentTenantId();
    String passwordHash = passwordHasher.hash(adminPassword);
    boolean userExists = authRepository.userExists(tenantId, adminUsername);
    if (userExists && resetPassword) {
      authRepository.updatePasswordHash(tenantId, adminUsername, passwordHash);
    } else if (!userExists) {
      authRepository.createUser(tenantId, idGenerator.nextId("sys_user"), adminUsername, passwordHash, adminUsername);
    }
    authRepository.ensureUserRole(tenantId, adminUsername, "admin");
  }
}
