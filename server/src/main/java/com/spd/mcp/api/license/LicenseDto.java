package com.spd.mcp.api.license;

import java.time.LocalDate;

public record LicenseDto(
    long id,
    String licenseCode,
    String licenseName,
    String licenseType,
    String relatedProduct,
    String hospitalName,
    LocalDate issueDate,
    LocalDate expiryDate,
    String expiryStatus,
    String status,
    String fileUrl,
    String remark
) {}
