package com.spd.mcp.api.purchase;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record DeliveryEditItemRequest(
    @NotNull(message = "配送单明细 ID 不能为空")
    @Positive(message = "配送单明细 ID 必须大于 0")
    Long id,

    @NotNull(message = "商品 ID 不能为空")
    @Positive(message = "商品 ID 必须大于 0")
    Long productId,

    @NotNull(message = "计划数量不能为空")
    @PositiveOrZero(message = "计划数量不能小于 0")
    Integer planQty,

    @NotNull(message = "本次数量不能为空")
    @PositiveOrZero(message = "本次数量不能小于 0")
    Integer deliveredQty,

    LocalDate productionDate,
    LocalDate expiryDate,

    @Size(max = 50, message = "批号不能超过 50 个字符")
    String batchNo,

    @Size(max = 500, message = "备注不能超过 500 个字符")
    String remark
) {}
