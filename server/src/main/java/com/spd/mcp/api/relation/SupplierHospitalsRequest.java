package com.spd.mcp.api.relation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

public record SupplierHospitalsRequest(
    @NotNull(message = "供应商 ID 列表不能为空")
    List<@Positive(message = "供应商 ID 必须大于 0") Long> supplierIds,
    @NotNull(message = "医院 ID 列表不能为空")
    List<@Positive(message = "医院 ID 必须大于 0") Long> hospitalIds
) {}
