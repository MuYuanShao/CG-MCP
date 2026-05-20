package com.spd.mcp.api.refund;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record RefundSyncRequest(
    @NotBlank(message = "退货单号不能为空")
    @Size(max = 50, message = "退货单号不能超过 50 个字符")
    String refundNo,

    @Size(max = 50, message = "关联订单不能超过 50 个字符")
    String relatedOrderNo,

    @NotBlank(message = "医院不能为空")
    @Size(max = 200, message = "医院不能超过 200 个字符")
    String hospital,

    @NotBlank(message = "商品不能为空")
    @Size(max = 200, message = "商品不能超过 200 个字符")
    String productName,

    @Size(max = 50, message = "批号不能超过 50 个字符")
    String batchNo,

    @NotNull(message = "退货数量不能为空")
    @Min(value = 1, message = "退货数量必须大于 0")
    Integer refundQty,

    @NotNull(message = "退货金额不能为空")
    @DecimalMin(value = "0.00", message = "退货金额不能小于 0")
    BigDecimal refundAmount,

    @Size(max = 500, message = "退货原因不能超过 500 个字符")
    String reason,

    @NotNull(message = "申请日期不能为空")
    LocalDate applyDate,

    String status
) {}
