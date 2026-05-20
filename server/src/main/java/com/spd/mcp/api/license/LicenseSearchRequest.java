package com.spd.mcp.api.license;

public record LicenseSearchRequest(
    String licenseType,
    String productName,
    String manufacturer,
    String registrationNo,
    String contractCode,
    String licenseCode
) {
  boolean hasAnyCondition() {
    return hasText(licenseType)
        || hasText(productName)
        || hasText(manufacturer)
        || hasText(registrationNo)
        || hasText(contractCode)
        || hasText(licenseCode);
  }

  private static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
