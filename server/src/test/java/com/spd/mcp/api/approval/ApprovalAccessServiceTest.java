package com.spd.mcp.api.approval;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.spd.mcp.api.auth.AuthContext;
import com.spd.mcp.api.auth.AuthenticatedUser;
import com.spd.mcp.api.common.BusinessException;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ApprovalAccessServiceTest {
  @Mock
  private AuthContext authContext;

  @Mock
  private ApprovalAccessRepository repository;

  @Test
  void administratorAlwaysHasApprovalAccess() {
    when(authContext.currentUser()).thenReturn(Optional.of(user("buyer", "SPD_ADMIN")));
    ApprovalAccessService service = new ApprovalAccessService(authContext, repository);

    assertTrue(service.canOperate(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW));
    verify(repository, never()).hasConfiguredAccess(1L, "buyer", ApprovalAccessService.PURCHASE_PLAN_WORKFLOW);
  }

  @Test
  void configuredRoleOrUserHasApprovalAccess() {
    when(authContext.currentUser()).thenReturn(Optional.of(user("buyer", "ROLE_BUYER")));
    when(repository.hasConfiguredAccess(1L, "buyer", ApprovalAccessService.PURCHASE_PLAN_WORKFLOW)).thenReturn(true);
    ApprovalAccessService service = new ApprovalAccessService(authContext, repository);

    assertTrue(service.canOperate(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW));
  }

  @Test
  void unconfiguredUserIsReadOnly() {
    when(authContext.currentUser()).thenReturn(Optional.of(user("viewer", "ROLE_VIEWER")));
    ApprovalAccessService service = new ApprovalAccessService(authContext, repository);

    assertFalse(service.canOperate(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW));
    BusinessException exception = assertThrows(
        BusinessException.class,
        () -> service.requireOperation(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW));
    assertTrue(exception.getCode().equals("APPROVAL_DATA_SCOPE_DENIED"));
  }

  private AuthenticatedUser user(String username, String role) {
    return new AuthenticatedUser(1L, username, role, Set.of());
  }
}
