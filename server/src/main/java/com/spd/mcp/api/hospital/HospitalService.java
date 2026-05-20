package com.spd.mcp.api.hospital;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalService {
  private final HospitalRepository hospitalRepository;
  private final TenantContext tenantContext;
  private final DbIdGenerator idGenerator;

  public HospitalService(HospitalRepository hospitalRepository, TenantContext tenantContext, DbIdGenerator idGenerator) {
    this.hospitalRepository = hospitalRepository;
    this.tenantContext = tenantContext;
    this.idGenerator = idGenerator;
  }

  public List<HospitalDto> findAll() {
    return hospitalRepository.findAll(tenantContext.currentTenantId());
  }

  @Transactional
  public HospitalDto create(HospitalRequest request) {
    long id = idGenerator.nextId("biz_hospital");
    hospitalRepository.insert(tenantContext.currentTenantId(), id, request);
    return getById(id);
  }

  @Transactional
  public HospitalDto update(long id, HospitalRequest request) {
    int affectedRows = hospitalRepository.update(tenantContext.currentTenantId(), id, request);
    if (affectedRows == 0) {
      throw new BusinessException("HOSPITAL_NOT_FOUND", "医院不存在", HttpStatus.NOT_FOUND);
    }
    return getById(id);
  }

  @Transactional
  public void delete(List<Long> ids) {
    for (Long id : ids) {
      hospitalRepository.delete(tenantContext.currentTenantId(), id);
    }
  }

  private HospitalDto getById(long id) {
    return hospitalRepository.findById(tenantContext.currentTenantId(), id)
        .orElseThrow(() -> new BusinessException("HOSPITAL_NOT_FOUND", "医院不存在", HttpStatus.NOT_FOUND));
  }
}
