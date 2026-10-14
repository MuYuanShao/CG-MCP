package com.spd.mcp.api.auth;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRepository {
  private final JdbcTemplate jdbcTemplate;

  public AuthRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public Optional<UserAccount> findActiveUser(long tenantId, String username) {
    return jdbcTemplate.query("""
        SELECT u.id, u.tenant_id, u.username, u.password_hash, u.real_name, r.role_code
        FROM sys_user u
        JOIN sys_user_role ur ON ur.user_id = u.id
        JOIN sys_role r ON r.tenant_id = u.tenant_id AND r.id = ur.role_id AND r.deleted = 0
        WHERE u.tenant_id = ? AND u.username = ? AND u.deleted = 0 AND u.status = 1
        ORDER BY CASE
          WHEN UPPER(r.role_code) IN ('ADMIN', 'ROLE_ADMIN', 'SPD_ADMIN', 'SYSTEM_ADMIN') THEN 0
          ELSE 1
        END, r.id ASC
        LIMIT 1
        """,
        (rs, rowNum) -> new UserAccount(
            rs.getLong("id"),
            rs.getLong("tenant_id"),
            rs.getString("username"),
            rs.getString("password_hash"),
            rs.getString("real_name"),
            rs.getString("role_code")),
        tenantId,
        username).stream().findFirst();
  }

  public Optional<UserAccount> findActiveUserById(long tenantId, long userId) {
    return jdbcTemplate.query("""
        SELECT u.id, u.tenant_id, u.username, u.password_hash, u.real_name, r.role_code
        FROM sys_user u
        JOIN sys_user_role ur ON ur.user_id = u.id
        JOIN sys_role r ON r.tenant_id = u.tenant_id AND r.id = ur.role_id AND r.deleted = 0
        WHERE u.tenant_id = ? AND u.id = ? AND u.deleted = 0 AND u.status = 1
        ORDER BY CASE
          WHEN UPPER(r.role_code) IN ('ADMIN', 'ROLE_ADMIN', 'SPD_ADMIN', 'SYSTEM_ADMIN') THEN 0
          ELSE 1
        END, r.id ASC
        LIMIT 1
        """,
        (rs, rowNum) -> new UserAccount(
            rs.getLong("id"),
            rs.getLong("tenant_id"),
            rs.getString("username"),
            rs.getString("password_hash"),
            rs.getString("real_name"),
            rs.getString("role_code")),
        tenantId,
        userId).stream().findFirst();
  }

  public Set<String> findPermissions(long tenantId, long userId) {
    List<String> rows = jdbcTemplate.queryForList("""
        SELECT DISTINCT p.permission_code
        FROM sys_user_role ur
        JOIN sys_user u ON u.id = ur.user_id
        JOIN sys_role_permission rp ON rp.role_id = ur.role_id
        JOIN sys_permission p ON p.id = rp.permission_id
        WHERE u.tenant_id = ? AND ur.user_id = ? AND u.deleted = 0
        """,
        String.class,
        tenantId,
        userId);
    return rows.stream().collect(Collectors.toUnmodifiableSet());
  }

  public boolean userExists(long tenantId, String username) {
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM sys_user WHERE tenant_id = ? AND username = ? AND deleted = 0",
        Integer.class,
        tenantId,
        username);
    return count != null && count > 0;
  }

  public void createUser(long tenantId, long userId, String username, String passwordHash, String displayName) {
    jdbcTemplate.update("""
        INSERT INTO sys_user (id, tenant_id, username, password_hash, real_name, status)
        VALUES (?, ?, ?, ?, ?, 1)
        """,
        userId,
        tenantId,
        username,
        passwordHash,
        displayName);
  }

  public void updatePasswordHash(long tenantId, String username, String passwordHash) {
    jdbcTemplate.update("""
        UPDATE sys_user
        SET password_hash = ?, status = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND username = ? AND deleted = 0
        """,
        passwordHash,
        tenantId,
        username);
  }

  public void ensureUserRole(long tenantId, String username, String roleCode) {
    jdbcTemplate.update("""
        INSERT IGNORE INTO sys_user_role (user_id, role_id)
        SELECT u.id, r.id
        FROM sys_user u
        JOIN sys_role r ON r.tenant_id = u.tenant_id AND r.role_code = ? AND r.deleted = 0
        WHERE u.tenant_id = ? AND u.username = ? AND u.deleted = 0
        """,
        roleCode,
        tenantId,
        username);
  }
}
