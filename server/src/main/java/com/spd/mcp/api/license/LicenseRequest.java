package com.spd.mcp.api.license;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record LicenseRequest(
    String licenseCode,
    @NotBlank(message = "证照名称不能为空") String licenseName,
    @NotBlank(message = "证照分类不能为空") String licenseType,
    String relatedProduct,
    @NotBlank(message = "医院名称不能为空") String hospitalName,
    @NotNull(message = "证照开始日期不能为空") LocalDate issueDate,
    @NotNull(message = "证照结束日期不能为空") LocalDate expiryDate,
    String fileUrl,
    String remark,
    Long productId
) {}
