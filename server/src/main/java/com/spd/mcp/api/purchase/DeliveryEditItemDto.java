package com.spd.mcp.api.purchase;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DeliveryEditItemDto(
    Long id,
    Long productId,
    String productCode,
    String productName,
    String spec,
    String model,
    String unit,
    BigDecimal unitPrice,
    String manufacturer,
    Integer planQty,
    Integer deliveredQty,
    LocalDate productionDate,
    LocalDate expiryDate,
    String batchNo,
    String remark
) {}
