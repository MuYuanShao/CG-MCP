package com.spd.mcp.api.operation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record FrontendOperationRequest(
    @NotBlank(message = "模块编码不能为空")
    @Size(max = 80, message = "模块编码不能超过 80 个字符")
    String moduleCode,

    @NotBlank(message = "动作编码不能为空")
    @Size(max = 80, message = "动作编码不能超过 80 个字符")
    String actionCode,

    @NotBlank(message = "操作信息不能为空")
    @Size(max = 500, message = "操作信息不能超过 500 个字符")
    String message,

    @Size(max = 80, message = "业务 ID 不能超过 80 个字符")
    String businessId,

    Map<String, Object> details
) {}
