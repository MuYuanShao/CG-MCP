package com.spd.mcp.api.approval;

import com.spd.mcp.api.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/approval-scopes")
public class ApprovalScopeController {
  private final ApprovalAccessService approvalAccessService;

  public ApprovalScopeController(ApprovalAccessService approvalAccessService) {
    this.approvalAccessService = approvalAccessService;
  }

  @GetMapping("/purchase-plan")
  public ApiResponse<ApprovalScopeConfigDto> purchasePlanScope() {
    return ApiResponse.success(approvalAccessService.getScopeConfig(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW));
  }

  @PutMapping("/purchase-plan")
  public ApiResponse<ApprovalScopeConfigDto> updatePurchasePlanScope(
      @RequestBody ApprovalScopeUpdateRequest request
  ) {
    return ApiResponse.success(approvalAccessService.updateScopeConfig(
        ApprovalAccessService.PURCHASE_PLAN_WORKFLOW,
        request));
  }
}
