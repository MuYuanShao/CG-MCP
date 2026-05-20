package com.spd.mcp.api.hospital;

import java.time.LocalDate;

public record HospitalDto(
    Long id,
    String code,
    String name,
    String level,
    String city,
    String contact,
    String phone,
    String status,
    LocalDate cooperationDate
) {}
