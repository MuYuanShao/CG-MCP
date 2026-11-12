package com.spd.mcp.api.purchase;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BusinessDocumentDto(
    Long id,
    String documentNo,
    String sourceNo,
    String hospital,
    String productName,
    Number quantity,
    BigDecimal amount,
    LocalDate businessDate,
    String status,
    boolean canApprove,
    boolean canEdit,
    PlanFields planFields
) {
  public record PlanFields(String productCode, String spec, String model, String unit,
      BigDecimal unitPrice, String registrationNo, String manufacturer, String sourceStatus,
      String supplierCode, String currency, Boolean taxIncluded, String instanceId, String sourceLineId,
      String supplierName, String receivingAddress, String quantityExact, String amountExact, String unitPriceExact, String zcLocalCode) {}
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
    this(id, documentNo, sourceNo, hospital, productName, quantity, amount, businessDate, status, false, false, null);
  }

  public BusinessDocumentDto withCapabilities(boolean canApprove, boolean canEdit) {
    return new BusinessDocumentDto(
        id, documentNo, sourceNo, hospital, productName, quantity, amount, businessDate, status, canApprove, canEdit, planFields);
  }
}
