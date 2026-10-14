package com.spd.mcp.api.purchase;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchasePlanUpdateRequest(
    @NotNull @Min(1) Integer quantity,
    @NotNull @DecimalMin(value = "0.0001") BigDecimal unitPrice,
    @NotNull LocalDate expectedDeliveryDate
) {}
