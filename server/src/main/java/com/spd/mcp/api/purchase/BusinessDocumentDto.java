package com.spd.mcp.api.purchase;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BusinessDocumentDto(
    Long id,
    String documentNo,
    String sourceNo,
    String hospital,
    String productName,
    Integer quantity,
    BigDecimal amount,
    LocalDate businessDate,
    String status
) {}
