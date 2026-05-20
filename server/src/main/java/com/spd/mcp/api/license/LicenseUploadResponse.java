package com.spd.mcp.api.license;

public record LicenseUploadResponse(
    String fileUrl,
    String originalFilename,
    long size,
    String contentType
) {}
