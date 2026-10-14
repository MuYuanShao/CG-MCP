package com.spd.mcp.api.integration;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public final class Phase2Types {
  private Phase2Types() {}
  public record ReceivingLine(@NotBlank String lineId,@NotBlank String orderLineId,@NotBlank String productCode,
      @NotBlank String unit,String productionBatchNo,@NotNull @DecimalMin("0") BigDecimal quantity,
      @NotNull @DecimalMin("0") BigDecimal qualifiedQuantity,@NotNull @DecimalMin("0") BigDecimal rejectedQuantity,String reason) {}
  public record Receiving(@NotBlank @Size(max=100) String documentNo,@NotBlank String orderNo,@NotBlank String supplierCode,
      @NotBlank String warehouseCode,@NotBlank String warehouseName,@NotNull LocalDate documentDate,LocalDate receivedDate,
      @NotBlank @Pattern(regexp="draft|approved|rejected|cancelled|voided") String status,
      @NotNull Instant sourceUpdatedAt,@NotEmpty @Size(max=1000) List<@Valid ReceivingLine> items) {}
  public record InboundLine(@NotBlank String lineId,@NotBlank String receivingLineId,@NotBlank String productCode,@NotBlank String unit,
      @NotBlank String systemBatchNo,String productionBatchNo,LocalDate productionDate,LocalDate expiryDate,
      @NotNull @DecimalMin(value="0",inclusive=false) BigDecimal quantity,@NotNull @DecimalMin("0") BigDecimal amount) {}
  public record Inbound(@NotBlank @Size(max=100) String documentNo,@NotBlank String receivingNo,@NotBlank String warehouseCode,
      @NotBlank String warehouseName,@NotNull LocalDate documentDate,@NotBlank @Pattern(regexp="draft|completed|cancelled|voided") String status,
      @NotBlank @Pattern(regexp="[A-Z]{3}") String currency,@NotNull Boolean taxIncluded,
      @NotNull Instant sourceUpdatedAt,@NotEmpty @Size(max=1000) List<@Valid InboundLine> items,
      @Pattern(regexp="captured|legacy_backfill|provided") String amountOrigin) {
    public Inbound {if(amountOrigin==null) amountOrigin="provided";}
    public Inbound(String documentNo,String receivingNo,String warehouseCode,String warehouseName,LocalDate documentDate,String status,String currency,Boolean taxIncluded,Instant sourceUpdatedAt,List<InboundLine> items) {
      this(documentNo,receivingNo,warehouseCode,warehouseName,documentDate,status,currency,taxIncluded,sourceUpdatedAt,items,"provided");
    }
  }
  public record ReturnLine(@NotBlank String lineId,@NotBlank String inboundLineId,@NotBlank String productCode,@NotBlank String unit,
      @NotBlank String systemBatchNo,@NotNull @DecimalMin(value="0",inclusive=false) BigDecimal quantity,
      @NotNull @DecimalMin("0") BigDecimal amount,@NotBlank String reason) {}
  public record PurchaseReturn(@NotBlank @Size(max=100) String documentNo,@NotBlank String inboundNo,@NotBlank String warehouseCode,
      @NotNull LocalDate documentDate,@NotBlank @Pattern(regexp="draft|completed|cancelled|voided") String status,
      @NotBlank @Pattern(regexp="[A-Z]{3}") String currency,@NotNull Boolean taxIncluded,
      @NotNull Instant sourceUpdatedAt,@NotEmpty @Size(max=1000) List<@Valid ReturnLine> items) {}
  public record StockLine(@NotBlank String warehouseCode,@NotBlank String warehouseName,@NotBlank String productCode,
      @NotBlank String unit,@NotBlank String systemBatchNo,String productionBatchNo,LocalDate productionDate,LocalDate expiryDate,
      @NotNull @DecimalMin("0") BigDecimal looseQuantity,@NotNull @DecimalMin("0") BigDecimal packagedQuantity,
      @NotNull @DecimalMin("0") BigDecimal lockedQuantity,@NotNull @DecimalMin("0") BigDecimal isolatedQuantity,
      @NotNull @DecimalMin("0") BigDecimal inTransitQuantity,@NotNull @DecimalMin("0") BigDecimal amount) {
    public BigDecimal availableQuantity() {return looseQuantity.add(packagedQuantity);}
  }
  public record Inventory(@NotBlank @Pattern(regexp="[A-Z]{3}") String currency,@NotNull Boolean taxIncluded,
      @NotBlank @Pattern(regexp="catalog_purchase_price") String valuationBasis,@NotNull Instant sourceUpdatedAt,
      @NotNull @Size(max=10000) List<@Valid StockLine> items) {}
}
