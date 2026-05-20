package com.spd.mcp.api.purchase;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record DeliveryEditSaveRequest(
    LocalDate deliveryDate,

    @Size(max = 500, message = "配送备注不能超过 500 个字符")
    String remark,

    Boolean submitted,

    @Valid
    @NotEmpty(message = "配送单明细不能为空")
    List<DeliveryEditItemRequest> items
) {}
