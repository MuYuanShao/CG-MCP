package com.spd.mcp.api.relation;

import com.spd.mcp.api.tenant.TenantContext;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierHospitalRelationService {
  private final SupplierHospitalRelationRepository repository;
  private final TenantContext tenantContext;

  public SupplierHospitalRelationService(SupplierHospitalRelationRepository repository, TenantContext tenantContext) {
    this.repository = repository;
    this.tenantContext = tenantContext;
  }

  public List<Long> findSupplierIdsByHospital(long hospitalId) {
    return repository.findSupplierIdsByHospital(tenantContext.currentTenantId(), hospitalId);
  }

  public List<Long> findHospitalIdsBySupplier(long supplierId) {
    return repository.findHospitalIdsBySupplier(tenantContext.currentTenantId(), supplierId);
  }

  public Map<Long, List<Long>> findHospitalIdsBySuppliers() {
    return repository.findHospitalIdsBySuppliers(tenantContext.currentTenantId());
  }

  @Transactional
  public List<Long> replaceSuppliersForHospital(long hospitalId, List<Long> supplierIds) {
    repository.replaceSuppliersForHospital(tenantContext.currentTenantId(), hospitalId, supplierIds);
    return supplierIds;
  }

  @Transactional
  public List<Long> replaceHospitalsForSupplier(long supplierId, List<Long> hospitalIds) {
    repository.replaceHospitalsForSupplier(tenantContext.currentTenantId(), supplierId, hospitalIds);
    return hospitalIds;
  }

  @Transactional
  public Map<Long, List<Long>> replaceHospitalsForSuppliers(List<Long> supplierIds, List<Long> hospitalIds) {
    long tenantId = tenantContext.currentTenantId();
    for (Long supplierId : supplierIds) {
      repository.replaceHospitalsForSupplier(tenantId, supplierId, hospitalIds);
    }
    return repository.findHospitalIdsBySuppliers(tenantId);
  }
}
