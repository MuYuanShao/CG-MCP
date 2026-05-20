package com.spd.mcp.api.supplier;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierService {
  private final SupplierRepository supplierRepository;
  private final TenantContext tenantContext;
  private final DbIdGenerator idGenerator;

  public SupplierService(SupplierRepository supplierRepository, TenantContext tenantContext, DbIdGenerator idGenerator) {
    this.supplierRepository = supplierRepository;
    this.tenantContext = tenantContext;
    this.idGenerator = idGenerator;
  }

  public List<SupplierDto> findAll() {
    return supplierRepository.findAll(tenantContext.currentTenantId());
  }

  @Transactional
  public SupplierDto create(SupplierRequest request) {
    validateStatus(request.status());
    long id = idGenerator.nextId("biz_supplier");
    try {
      supplierRepository.insert(tenantContext.currentTenantId(), id, request);
    } catch (DuplicateKeyException exception) {
      throw new BusinessException("SUPPLIER_CODE_EXISTS", "供应商编码已存在");
    }
    return getById(id);
  }

  @Transactional
  public SupplierDto update(long id, SupplierRequest request) {
    validateStatus(request.status());
    int affectedRows;
    try {
      affectedRows = supplierRepository.update(tenantContext.currentTenantId(), id, request);
    } catch (DuplicateKeyException exception) {
      throw new BusinessException("SUPPLIER_CODE_EXISTS", "供应商编码已存在");
    }
    if (affectedRows == 0) {
      throw new BusinessException("SUPPLIER_NOT_FOUND", "供应商不存在", HttpStatus.NOT_FOUND);
    }
    return getById(id);
  }

  @Transactional
  public void delete(List<Long> ids) {
    for (Long id : ids) {
      supplierRepository.delete(tenantContext.currentTenantId(), id);
    }
  }

  private SupplierDto getById(long id) {
    return supplierRepository.findById(tenantContext.currentTenantId(), id)
        .orElseThrow(() -> new BusinessException("SUPPLIER_NOT_FOUND", "供应商不存在", HttpStatus.NOT_FOUND));
  }

  private void validateStatus(String status) {
    if (status == null || "active".equals(status) || "inactive".equals(status)) {
      return;
    }
    throw new BusinessException("SUPPLIER_STATUS_INVALID", "供应商状态无效");
  }
}
