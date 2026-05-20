package com.spd.mcp.api.purchase;

import java.time.LocalDate;

public record PurchaseOrderSearchRequest(
    String orderNo,
    String sourcePlan,
    String productName,
    String hospital,
    LocalDate startDate,
    LocalDate endDate
) {}
