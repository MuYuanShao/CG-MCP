package com.spd.mcp.api.tenant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TenantContext {
  private static final ThreadLocal<Long> CURRENT_TENANT_ID = new ThreadLocal<>();
  private final long defaultTenantId;

  public TenantContext(@Value("${app.tenant.default-id:1}") long defaultTenantId) {
    this.defaultTenantId = defaultTenantId;
  }

  public long currentTenantId() {
    Long tenantId = CURRENT_TENANT_ID.get();
    return tenantId == null ? defaultTenantId : tenantId;
  }

  void setTenantId(long tenantId) {
    CURRENT_TENANT_ID.set(tenantId);
  }

  void clear() {
    CURRENT_TENANT_ID.remove();
  }
}
