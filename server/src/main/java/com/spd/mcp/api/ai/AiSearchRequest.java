package com.spd.mcp.api.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiSearchRequest(
    @NotBlank(message = "AI搜索内容不能为空")
    @Size(max = 2000, message = "AI搜索内容不能超过 2000 个字符")
    String query
) {}
