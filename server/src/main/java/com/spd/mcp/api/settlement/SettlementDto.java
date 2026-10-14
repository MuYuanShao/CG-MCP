package com.spd.mcp.api.settlement;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SettlementDto(
    Long id,
    String settlementNo,
    String hospital,
    LocalDate settlementStart,
    LocalDate settlementEnd,
    BigDecimal amount,
    Integer status
) {}
