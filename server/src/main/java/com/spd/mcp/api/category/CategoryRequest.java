package com.spd.mcp.api.category;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
    @NotBlank(message = "分类名称不能为空")
    @Size(max = 80, message = "分类名称不能超过80个字符") String categoryName,
    @NotNull(message = "排序不能为空")
    @Min(value = 0, message = "排序不能为负数") Integer sortOrder) {}
