package com.spd.mcp.api.approval;

import com.spd.mcp.api.auth.AuthContext;
import com.spd.mcp.api.auth.AuthenticatedUser;
import com.spd.mcp.api.common.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ApprovalAccessService {
  public static final String PURCHASE_PLAN_WORKFLOW = "purchase_plan";

  private final AuthContext authContext;
  private final ApprovalAccessRepository approvalAccessRepository;

  public ApprovalAccessService(AuthContext authContext, ApprovalAccessRepository approvalAccessRepository) {
    this.authContext = authContext;
    this.approvalAccessRepository = approvalAccessRepository;
  }

  public boolean canOperate(String workflowCode) {
    AuthenticatedUser user = currentUser();
    if (isAdministrator(user)) {
      return true;
    }
    return approvalAccessRepository.hasConfiguredAccess(user.tenantId(), user.username(), workflowCode);
  }

  public void requireOperation(String workflowCode) {
    if (!canOperate(workflowCode)) {
      throw new BusinessException(
          "APPROVAL_DATA_SCOPE_DENIED",
          "当前用户未配置该审批流的角色或用户范围，仅可查看",
          HttpStatus.FORBIDDEN);
    }
  }

  public void requireAdministrator() {
    if (!isAdministrator(currentUser())) {
      throw new BusinessException("ADMIN_REQUIRED", "仅管理员可配置审批范围", HttpStatus.FORBIDDEN);
    }
  }

  public ApprovalScopeConfigDto getScopeConfig(String workflowCode) {
    requireAdministrator();
    long tenantId = currentUser().tenantId();
    return new ApprovalScopeConfigDto(
        workflowCode,
        approvalAccessRepository.listRoles(tenantId),
        approvalAccessRepository.listUsers(tenantId),
        approvalAccessRepository.listSelectedSubjectIds(tenantId, workflowCode, "ROLE"),
        approvalAccessRepository.listSelectedSubjectIds(tenantId, workflowCode, "USER"));
  }

  @Transactional
  public ApprovalScopeConfigDto updateScopeConfig(String workflowCode, ApprovalScopeUpdateRequest request) {
    requireAdministrator();
    long tenantId = currentUser().tenantId();
    List<Long> roleIds = distinctIds(request == null ? null : request.roleIds());
    List<Long> userIds = distinctIds(request == null ? null : request.userIds());
    List<Long> availableRoleIds = approvalAccessRepository.listRoles(tenantId).stream()
        .map(ApprovalScopeOptionDto::id).toList();
    List<Long> availableUserIds = approvalAccessRepository.listUsers(tenantId).stream()
        .map(ApprovalScopeOptionDto::id).toList();
    if (!availableRoleIds.containsAll(roleIds) || !availableUserIds.containsAll(userIds)) {
      throw new BusinessException("APPROVAL_SCOPE_SUBJECT_INVALID", "审批范围包含无效的角色或用户");
    }
    approvalAccessRepository.replaceScope(tenantId, workflowCode, roleIds, userIds);
    return getScopeConfig(workflowCode);
  }

  private List<Long> distinctIds(List<Long> ids) {
    if (ids == null) {
      return List.of();
    }
    return ids.stream().filter(id -> id != null && id > 0).distinct().toList();
  }

  private AuthenticatedUser currentUser() {
    return authContext.currentUser().orElseThrow(() -> new BusinessException(
        "AUTH_REQUIRED", "请先登录", HttpStatus.UNAUTHORIZED));
  }

  private boolean isAdministrator(AuthenticatedUser user) {
    if ("admin".equalsIgnoreCase(user.username())) {
      return true;
    }
    String role = user.role() == null ? "" : user.role().toUpperCase();
    return role.equals("ADMIN")
        || role.equals("ROLE_ADMIN")
        || role.equals("SPD_ADMIN")
        || role.equals("SYSTEM_ADMIN")
        || approvalAccessRepository.hasAdministratorRole(user.tenantId(), user.username());
  }
}
