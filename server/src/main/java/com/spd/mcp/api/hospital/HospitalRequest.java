package com.spd.mcp.api.hospital;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HospitalRequest(
    @NotBlank(message = "医院编号不能为空")
    @Size(max = 50, message = "医院编号不能超过 50 个字符")
    String code,

    @NotBlank(message = "医院名称不能为空")
    @Size(max = 200, message = "医院名称不能超过 200 个字符")
    String name,

    @Size(max = 50, message = "医院等级不能超过 50 个字符")
    String level,

    @Size(max = 80, message = "所在城市不能超过 80 个字符")
    String city,

    @Size(max = 50, message = "联系人不能超过 50 个字符")
    String contact,

    @Size(max = 20, message = "联系电话不能超过 20 个字符")
    String phone,

    String status
) {}
