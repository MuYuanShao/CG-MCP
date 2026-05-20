package com.spd.mcp.api.product;

import java.math.BigDecimal;

public record ProductDto(
    long id,
    String code,
    String name,
    String genericName,
    String spec,
    String model,
    BigDecimal unitPrice,
    String unit,
    String registrationNo,
    String medicalInsuranceCode,
    String udi,
    String category,
    String manufacturer,
    String distributor,
    String brand,
    int isImported,
    int isVolume,
    String volumeCategory,
    String zcLocalCode,
    int mediumPackage,
    int largePackage,
    String hospitalContractCode,
    String status
) {}
