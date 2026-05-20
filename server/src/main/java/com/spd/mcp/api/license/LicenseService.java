package com.spd.mcp.api.license;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LicenseService {
  private final LicenseRepository licenseRepository;
  private final TenantContext tenantContext;
  private final DbIdGenerator idGenerator;

  public LicenseService(
      LicenseRepository licenseRepository,
      TenantContext tenantContext,
      DbIdGenerator idGenerator
  ) {
    this.licenseRepository = licenseRepository;
    this.tenantContext = tenantContext;
    this.idGenerator = idGenerator;
  }

  public List<LicenseDto> search(LicenseSearchRequest request) {
    return licenseRepository.search(tenantContext.currentTenantId(), request);
  }

  @Transactional
  public LicenseDto create(LicenseRequest request) {
    long id = idGenerator.nextId("biz_license");
    licenseRepository.insert(tenantContext.currentTenantId(), id, request);
    return getById(id);
  }

  @Transactional
  public LicenseDto update(long id, LicenseRequest request) {
    int affectedRows = licenseRepository.update(tenantContext.currentTenantId(), id, request);
    if (affectedRows == 0) {
      throw new BusinessException("LICENSE_NOT_FOUND", "证照不存在", HttpStatus.NOT_FOUND);
    }
    return getById(id);
  }

  @Transactional
  public void delete(List<Long> ids) {
    for (Long id : ids) {
      if (id != null && id > 0) {
        licenseRepository.delete(tenantContext.currentTenantId(), id);
      }
    }
  }

  private LicenseDto getById(long id) {
    return licenseRepository.findById(tenantContext.currentTenantId(), id)
        .orElseThrow(() -> new BusinessException("LICENSE_NOT_FOUND", "证照不存在", HttpStatus.NOT_FOUND));
  }
}
