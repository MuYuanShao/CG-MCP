package com.spd.mcp.api.relation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

public record RelationIdsRequest(
    @NotNull(message = "关联 ID 列表不能为空")
    List<@Positive(message = "关联 ID 必须大于 0") Long> ids
) {}
