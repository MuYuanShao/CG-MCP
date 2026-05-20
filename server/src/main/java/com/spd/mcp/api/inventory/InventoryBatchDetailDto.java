package com.spd.mcp.api.inventory;

import java.time.LocalDate;

public record InventoryBatchDetailDto(
    Long id,
    String productName,
    String spec,
    String model,
    String batchNo,
    LocalDate expiryDate,
    Integer quantity
) {}
