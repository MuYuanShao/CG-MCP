package com.spd.mcp.api.purchase;

public record PurchaseOrderItemSearchRequest(
    String productCode,
    String productName,
    String batchNo,
    String manufacturer,
    long current,
    long size
) {}
