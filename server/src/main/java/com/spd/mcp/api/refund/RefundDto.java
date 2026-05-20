package com.spd.mcp.api.refund;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RefundDto(
    Long id,
    String refundNo,
    String hospital,
    String relatedOrderNo,
    String productName,
    String batchNo,
    Integer refundQty,
    BigDecimal refundAmount,
    String reason,
    LocalDate applyDate,
    String status
) {}
