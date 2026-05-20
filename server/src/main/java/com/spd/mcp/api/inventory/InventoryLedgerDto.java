package com.spd.mcp.api.inventory;

public record InventoryLedgerDto(
    Long id,
    Long productId,
    String productCode,
    String productName,
    String spec,
    String warehouse,
    String location,
    Integer totalQty,
    Integer availableQty,
    Integer lockedQty,
    String expiryStatus,
    String status
) {}
