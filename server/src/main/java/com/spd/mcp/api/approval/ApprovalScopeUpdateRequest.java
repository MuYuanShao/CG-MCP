package com.spd.mcp.api.approval;

import java.util.List;

public record ApprovalScopeUpdateRequest(List<Long> roleIds, List<Long> userIds) {}
