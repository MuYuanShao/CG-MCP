package com.spd.mcp.api.purchase;

import java.time.LocalDate;
import java.util.List;

public record DeliveryEditDto(
    Long planId,
    String planNo,
    Long orderId,
    String orderNo,
    Long deliveryId,
    String deliveryNo,
    LocalDate deliveryDate,
    String status,
    String remark,
    List<DeliveryEditItemDto> items
) {}
