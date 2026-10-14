package com.spd.mcp.api.settlement;

import java.math.BigDecimal;

public record SettlementItemDto(
    Long id,
    String acceptanceNo,
    String productCode,
    String productName,
    String spec,
    String batchNo,
    String registrationNo,
    Integer qty,
    BigDecimal price,
    BigDecimal amount
) {}
