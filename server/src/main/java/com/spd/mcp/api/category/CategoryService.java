package com.spd.mcp.api.category;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {
  private final CategoryRepository repository;
  private final TenantContext tenant;
  private final DbIdGenerator ids;

  public CategoryService(CategoryRepository repository, TenantContext tenant, DbIdGenerator ids) {
    this.repository = repository;
    this.tenant = tenant;
    this.ids = ids;
  }

  public List<CategoryDto> findAll() {
    return repository.findAll(tenant.currentTenantId());
  }

  @Transactional
  public CategoryDto create(CategoryRequest request) {
    long id = ids.nextId("biz_product_category");
    long tenantId = tenant.currentTenantId();
    CategoryRequest normalized = normalize(request);
    requireUnique(tenantId, normalized.categoryName(), id);
    repository.insert(tenantId, id, normalized);
    return get(tenantId, id);
  }

  @Transactional
  public CategoryDto update(long id, CategoryRequest request) {
    repository.lockMutations();
    long tenantId = tenant.currentTenantId();
    CategoryDto old = get(tenantId, id);
    CategoryRequest normalized = normalize(request);
    requireUnique(tenantId, normalized.categoryName(), id);
    repository.update(tenantId, id, normalized);
    if (!old.categoryName().equals(normalized.categoryName())) {
      repository.renameProductReferences(tenantId, old.categoryName(), normalized.categoryName());
    }
    return get(tenantId, id);
  }

  @Transactional
  public int delete(List<Long> requestedIds) {
    repository.lockMutations();
    long tenantId = tenant.currentTenantId();
    List<Long> uniqueIds = requestedIds.stream().distinct().toList();
    List<CategoryDto> categories = uniqueIds.stream().map(id -> get(tenantId, id)).toList();
    for (CategoryDto category : categories) {
      if (repository.isUsed(tenantId, category.categoryName())) {
        throw new BusinessException("CATEGORY_IN_USE", "分类已被商品使用，不能删除：" + category.categoryName(), HttpStatus.CONFLICT);
      }
    }
    uniqueIds.forEach(id -> repository.delete(tenantId, id));
    return uniqueIds.size();
  }

  private CategoryDto get(long tenantId, long id) {
    return repository.findById(tenantId, id)
        .orElseThrow(() -> new BusinessException("CATEGORY_NOT_FOUND", "分类不存在", HttpStatus.NOT_FOUND));
  }

  private void requireUnique(long tenantId, String name, long id) {
    if (repository.nameExists(tenantId, name, id)) {
      throw new BusinessException("CATEGORY_NAME_EXISTS", "分类名称已存在", HttpStatus.CONFLICT);
    }
  }

  private CategoryRequest normalize(CategoryRequest request) {
    return new CategoryRequest(request.categoryName().trim(), request.sortOrder());
  }
}
