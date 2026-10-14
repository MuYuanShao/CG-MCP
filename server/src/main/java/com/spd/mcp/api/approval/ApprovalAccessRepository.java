package com.spd.mcp.api.approval;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ApprovalAccessRepository {
  private final JdbcTemplate jdbcTemplate;

  public ApprovalAccessRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public boolean hasConfiguredAccess(long tenantId, String username, String workflowCode) {
    Integer count = jdbcTemplate.queryForObject("""
        SELECT COUNT(*)
        FROM sys_user u
        WHERE u.tenant_id = ? AND u.username = ? AND u.deleted = 0 AND u.status = 1
          AND (
            EXISTS (
              SELECT 1
              FROM sys_approval_data_scope s
              WHERE s.tenant_id = u.tenant_id
                AND s.workflow_code = ?
                AND s.subject_type = 'USER'
                AND s.subject_id = u.id
            )
            OR EXISTS (
              SELECT 1
              FROM sys_user_role ur
              JOIN sys_role r ON r.id = ur.role_id
                AND r.tenant_id = u.tenant_id
                AND r.deleted = 0
                AND r.status = 1
              JOIN sys_approval_data_scope s ON s.tenant_id = u.tenant_id
                AND s.workflow_code = ?
                AND s.subject_type = 'ROLE'
                AND s.subject_id = r.id
              WHERE ur.user_id = u.id
            )
          )
        """, Integer.class, tenantId, username, workflowCode, workflowCode);
    return count != null && count > 0;
  }

  public boolean hasAdministratorRole(long tenantId, String username) {
    Integer count = jdbcTemplate.queryForObject("""
        SELECT COUNT(*)
        FROM sys_user u
        JOIN sys_user_role ur ON ur.user_id = u.id
        JOIN sys_role r ON r.id = ur.role_id AND r.tenant_id = u.tenant_id
        WHERE u.tenant_id = ? AND u.username = ?
          AND u.deleted = 0 AND u.status = 1 AND r.deleted = 0 AND r.status = 1
          AND UPPER(r.role_code) IN ('ADMIN', 'ROLE_ADMIN', 'SPD_ADMIN', 'SYSTEM_ADMIN')
        """, Integer.class, tenantId, username);
    return count != null && count > 0;
  }

  public List<ApprovalScopeOptionDto> listRoles(long tenantId) {
    return jdbcTemplate.query("""
        SELECT id, role_code, role_name
        FROM sys_role
        WHERE tenant_id = ? AND deleted = 0 AND status = 1
        ORDER BY role_name, id
        """, (rs, rowNum) -> new ApprovalScopeOptionDto(
            rs.getLong("id"), rs.getString("role_code"), rs.getString("role_name")), tenantId);
  }

  public List<ApprovalScopeOptionDto> listUsers(long tenantId) {
    return jdbcTemplate.query("""
        SELECT id, username, real_name
        FROM sys_user
        WHERE tenant_id = ? AND deleted = 0 AND status = 1
        ORDER BY real_name, id
        """, (rs, rowNum) -> new ApprovalScopeOptionDto(
            rs.getLong("id"), rs.getString("username"), rs.getString("real_name")), tenantId);
  }

  public List<Long> listSelectedSubjectIds(long tenantId, String workflowCode, String subjectType) {
    return jdbcTemplate.queryForList("""
        SELECT subject_id
        FROM sys_approval_data_scope
        WHERE tenant_id = ? AND workflow_code = ? AND subject_type = ?
        ORDER BY subject_id
        """, Long.class, tenantId, workflowCode, subjectType);
  }

  public void replaceScope(
      long tenantId,
      String workflowCode,
      List<Long> roleIds,
      List<Long> userIds
  ) {
    jdbcTemplate.update(
        "DELETE FROM sys_approval_data_scope WHERE tenant_id = ? AND workflow_code = ?",
        tenantId,
        workflowCode);
    roleIds.forEach(roleId -> jdbcTemplate.update("""
        INSERT INTO sys_approval_data_scope (tenant_id, workflow_code, subject_type, subject_id)
        SELECT ?, ?, 'ROLE', id
        FROM sys_role
        WHERE tenant_id = ? AND id = ? AND deleted = 0 AND status = 1
        """, tenantId, workflowCode, tenantId, roleId));
    userIds.forEach(userId -> jdbcTemplate.update("""
        INSERT INTO sys_approval_data_scope (tenant_id, workflow_code, subject_type, subject_id)
        SELECT ?, ?, 'USER', id
        FROM sys_user
        WHERE tenant_id = ? AND id = ? AND deleted = 0 AND status = 1
        """, tenantId, workflowCode, tenantId, userId));
  }
}
