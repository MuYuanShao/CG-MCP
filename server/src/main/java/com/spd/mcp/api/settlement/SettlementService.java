package com.spd.mcp.api.settlement;

import com.spd.mcp.api.tenant.TenantContext;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SettlementService {
  private final SettlementRepository settlementRepository;
  private final TenantContext tenantContext;

  public SettlementService(SettlementRepository settlementRepository, TenantContext tenantContext) {
    this.settlementRepository = settlementRepository;
    this.tenantContext = tenantContext;
  }

  public List<SettlementDto> list() {
    return settlementRepository.list(tenantContext.currentTenantId());
  }

  public SettlementDto findById(long settlementId) {
    return settlementRepository.findById(tenantContext.currentTenantId(), settlementId);
  }

  public List<SettlementItemDto> findItems(long settlementId) {
    return settlementRepository.findItems(tenantContext.currentTenantId(), settlementId);
  }
}
