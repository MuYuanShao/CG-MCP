package com.spd.mcp.api.approval;

import java.util.List;

public record ApprovalScopeConfigDto(
    String workflowCode,
    List<ApprovalScopeOptionDto> roles,
    List<ApprovalScopeOptionDto> users,
    List<Long> selectedRoleIds,
    List<Long> selectedUserIds
) {}
