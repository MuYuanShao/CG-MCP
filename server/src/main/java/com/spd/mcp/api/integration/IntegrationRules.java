package com.spd.mcp.api.integration;

import com.spd.mcp.api.common.BusinessException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

public final class IntegrationRules {
  private IntegrationRules() {}
  public static boolean isNewer(Instant incoming, Instant stored) { return incoming.isAfter(stored); }
  public static boolean reportable(String state) { return !Set.of("draft", "cancelled", "rejected", "voided").contains(state); }
  public static void validateOrder(OrderRequest order) {
    var lines = new HashSet<String>();
    BigDecimal sum = BigDecimal.ZERO;
    for (var item : order.items()) {
      if (!lines.add(item.lineId())) throw new BusinessException("DUPLICATE_LINE", "重复明细编号: " + item.lineId());
      if (item.quantity().signum() <= 0 || item.unitPrice().signum() < 0 || item.amount().signum() < 0)
        throw new BusinessException("INVALID_AMOUNT", "数量必须大于零，价格及金额不能为负数");
      sum = sum.add(item.amount());
    }
    if (sum.compareTo(order.totalAmount()) != 0)
      throw new BusinessException("TOTAL_MISMATCH", "订单总金额与明细金额合计不一致");
  }
}
