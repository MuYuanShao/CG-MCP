package com.spd.mcp.api.product;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
  private final ProductRepository productRepository;
  private final TenantContext tenantContext;
  private final DbIdGenerator idGenerator;

  public ProductService(ProductRepository productRepository, TenantContext tenantContext, DbIdGenerator idGenerator) {
    this.productRepository = productRepository;
    this.tenantContext = tenantContext;
    this.idGenerator = idGenerator;
  }

  public List<ProductDto> findAll() {
    return productRepository.findAll(tenantContext.currentTenantId());
  }

  @Transactional
  public ProductDto create(ProductRequest request) {
    long id = idGenerator.nextId("biz_product");
    productRepository.insert(tenantContext.currentTenantId(), id, request);
    return getById(id);
  }

  @Transactional
  public ProductDto update(long id, ProductRequest request) {
    int affectedRows = productRepository.update(tenantContext.currentTenantId(), id, request);
    if (affectedRows == 0) {
      throw new BusinessException("PRODUCT_NOT_FOUND", "商品不存在", HttpStatus.NOT_FOUND);
    }
    return getById(id);
  }

  @Transactional
  public void delete(List<Long> ids) {
    for (Long id : ids) {
      productRepository.delete(tenantContext.currentTenantId(), id);
    }
  }

  private ProductDto getById(long id) {
    return productRepository.findById(tenantContext.currentTenantId(), id)
        .orElseThrow(() -> new BusinessException("PRODUCT_NOT_FOUND", "商品不存在", HttpStatus.NOT_FOUND));
  }
}
