package com.spd.mcp.api.supplier;

import java.time.LocalDate;

public record SupplierDto(
    Long id,
    String code,
    String name,
    String category,
    String city,
    String contact,
    String phone,
    String status,
    LocalDate cooperationDate
) {}
