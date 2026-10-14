package com.spd.mcp.api.purchase;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BusinessDocumentDto(
    Long id,
    String documentNo,
    String sourceNo,
    String hospital,
    String productName,
    Integer quantity,
    BigDecimal amount,
    LocalDate businessDate,
    String status,
    boolean canApprove,
    boolean canEdit
) {
  public BusinessDocumentDto(
      Long id,
      String documentNo,
      String sourceNo,
      String hospital,
      String productName,
      Integer quantity,
      BigDecimal amount,
      LocalDate businessDate,
      String status
  ) {
    this(id, documentNo, sourceNo, hospital, productName, quantity, amount, businessDate, status, false, false);
  }

  public BusinessDocumentDto withCapabilities(boolean canApprove, boolean canEdit) {
    return new BusinessDocumentDto(
        id, documentNo, sourceNo, hospital, productName, quantity, amount, businessDate, status, canApprove, canEdit);
  }
}
