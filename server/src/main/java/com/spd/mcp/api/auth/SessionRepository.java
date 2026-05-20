package com.spd.mcp.api.auth;

import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SessionRepository {
  private final JdbcTemplate jdbcTemplate;

  public SessionRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public void create(long sessionId, long tenantId, long userId, String refreshTokenHash, Instant expiresAt) {
    jdbcTemplate.update("""
        INSERT INTO sys_user_session (id, tenant_id, user_id, refresh_token_hash, expires_at)
        VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))
        """,
        sessionId,
        tenantId,
        userId,
        refreshTokenHash,
        expiresAt.getEpochSecond());
  }

  public Optional<Long> consumeActiveUserId(long tenantId, String refreshTokenHash) {
    int updated = jdbcTemplate.update("""
        UPDATE sys_user_session
        SET revoked = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND refresh_token_hash = ? AND revoked = 0 AND expires_at > CURRENT_TIMESTAMP
        """,
        tenantId,
        refreshTokenHash);
    if (updated != 1) {
      return Optional.empty();
    }
    return jdbcTemplate.queryForList("""
        SELECT user_id
        FROM sys_user_session
        WHERE tenant_id = ? AND refresh_token_hash = ?
        LIMIT 1
        """,
        Long.class,
        tenantId,
        refreshTokenHash).stream().findFirst();
  }

  public void revoke(long tenantId, String refreshTokenHash) {
    jdbcTemplate.update("""
        UPDATE sys_user_session
        SET revoked = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND refresh_token_hash = ?
        """,
        tenantId,
        refreshTokenHash);
  }

  public void revokeUserSessions(long tenantId, long userId) {
    jdbcTemplate.update("""
        UPDATE sys_user_session
        SET revoked = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND user_id = ? AND revoked = 0
        """,
        tenantId,
        userId);
  }
}
