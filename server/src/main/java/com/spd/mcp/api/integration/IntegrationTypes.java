package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class IntegrationTypes {
  private IntegrationTypes() {}
  public record Instance(String id, String name, String organization, String endpoint, String tokenEnv, boolean enabled) {}
  public record InstanceRequest(
      @NotBlank @Size(max=200) String name, @NotBlank @Size(max=80) String organization,
      @NotBlank @Size(max=500) String endpoint, @Pattern(regexp="SPD_PR_[A-Z0-9_]+") @NotBlank @Size(max=100) String tokenEnv,
      boolean enabled) {}
  public record MasterRequest(@NotBlank @Size(max=100) String sourceCode, @NotBlank @Size(max=200) String name,
      @Size(max=50) String creditCode, @Size(max=50) String contactName, @Size(max=50) String contactPhone,
      @Pattern(regexp="active|inactive") @NotBlank String status, @NotNull Instant sourceUpdatedAt) {}
  public record OrderItem(@NotBlank @Size(max=100) String lineId, @NotBlank @Size(max=100) String productCode,
      @NotNull @DecimalMin(value="0", inclusive=false) BigDecimal quantity, @NotBlank @Size(max=20) String unit,
      @NotNull @DecimalMin("0") BigDecimal unitPrice, @NotNull @DecimalMin("0") BigDecimal amount) {}
  public record OrderRequest(@NotBlank @Size(max=100) String orderNo, @NotBlank @Size(max=100) String supplierCode,
      @NotNull LocalDate orderDate, @NotBlank @Pattern(regexp="draft|pending_approval|approved|sent|rejected|voided|submitted|confirmed|partial_shipped|shipped|arrived|accepted|completed|closed|cancelled") String status,
      @NotNull @DecimalMin("0") BigDecimal totalAmount, @NotBlank @Pattern(regexp="[A-Z]{3}") String currency,
      @NotNull Boolean taxIncluded, @NotNull Instant sourceUpdatedAt,
      @NotEmpty @Size(max=1000) List<@Valid OrderItem> items) {}
  public record DispatchRequest(@NotEmpty @Size(max=100) List<@NotNull @Positive Long> productIds, boolean licensesOnly) {}
  public record Receipt(@NotBlank @Pattern(regexp="processed|failed") String state, @Size(max=1000) String message,
      @Size(max=100) String productCode) {}
  public record SyncLog(String id, String batchId, String instanceId, String direction, String kind,
      String sourceCode, String state, String message, String createdTime) {}
  public record StoredRecord(String instanceId, String kind, String sourceCode, String sourceUpdatedAt, JsonNode payload) {}
}
