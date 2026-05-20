package com.spd.mcp.api.refund;

import com.spd.mcp.api.common.BusinessException;
import org.springframework.http.HttpStatus;

public enum RefundStatus {
  PENDING_AUDIT(0, "pending_audit", "待审核"),
  APPROVED(1, "approved", "已审核"),
  RETURNING(2, "returning", "退货中"),
  COMPLETED(3, "completed", "已完成"),
  REJECTED(4, "rejected", "已驳回"),
  CLOSED(5, "closed", "已关闭");

  private final int code;
  private final String key;
  private final String label;

  RefundStatus(int code, String key, String label) {
    this.code = code;
    this.key = key;
    this.label = label;
  }

  public int code() {
    return code;
  }

  public String key() {
    return key;
  }

  public String label() {
    return label;
  }

  public static RefundStatus fromCode(int code) {
    for (RefundStatus status : values()) {
      if (status.code == code) return status;
    }
    throw new BusinessException("REFUND_STATUS_UNKNOWN", "未知退货状态", HttpStatus.INTERNAL_SERVER_ERROR);
  }
  public static RefundStatus fromKey(String key) {
    if (key == null || key.isBlank()) return PENDING_AUDIT;
    for (RefundStatus status : values()) {
      if (status.key.equals(key)) return status;
    }
    throw new BusinessException("REFUND_STATUS_UNKNOWN", "未知退货状态", HttpStatus.BAD_REQUEST);
  }
}
