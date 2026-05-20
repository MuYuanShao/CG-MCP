package com.spd.mcp.api.inventory;

import com.spd.mcp.api.common.PageResult;
import com.spd.mcp.api.tenant.TenantContext;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {
  private final InventoryRepository inventoryRepository;
  private final TenantContext tenantContext;

  public InventoryService(InventoryRepository inventoryRepository, TenantContext tenantContext) {
    this.inventoryRepository = inventoryRepository;
    this.tenantContext = tenantContext;
  }

  public List<InventoryLedgerDto> ledger() {
    return inventoryRepository.ledger(tenantContext.currentTenantId());
  }

  public PageResult<InventoryBatchDetailDto> batchDetails(long productId, long current, long size) {
    long normalizedCurrent = Math.max(1, current);
    long normalizedSize = Math.min(50, Math.max(1, size));
    return inventoryRepository.batchDetails(
        tenantContext.currentTenantId(),
        productId,
        normalizedCurrent,
        normalizedSize);
  }
}
