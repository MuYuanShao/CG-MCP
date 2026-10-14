package com.spd.mcp.api.category;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CategoryRepository {
  private final JdbcTemplate jdbc;

  public CategoryRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<CategoryDto> findAll(long tenantId) {
    return jdbc.query("""
        SELECT id, category_name, sort_order FROM biz_product_category
        WHERE tenant_id = ? AND deleted = 0 ORDER BY sort_order, id
        """, (rs, row) -> new CategoryDto(rs.getLong("id"), rs.getString("category_name"), rs.getInt("sort_order")), tenantId);
  }

  public Optional<CategoryDto> findById(long tenantId, long id) {
    return jdbc.query("""
        SELECT id, category_name, sort_order FROM biz_product_category
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, (rs, row) -> new CategoryDto(rs.getLong("id"), rs.getString("category_name"), rs.getInt("sort_order")), tenantId, id)
        .stream().findFirst();
  }

  /** Serialize category mutations with the same lock used by the ID allocator. */
  public void lockMutations() {
    jdbc.queryForObject("SELECT next_id FROM sys_id_sequence WHERE table_name = 'biz_product_category' FOR UPDATE", Long.class);
  }

  public boolean nameExists(long tenantId, String name, long excludingId) {
    Integer count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM biz_product_category
        WHERE tenant_id = ? AND category_name = ? AND id <> ? AND deleted = 0
        """, Integer.class, tenantId, name, excludingId);
    return count != null && count > 0;
  }

  public void insert(long tenantId, long id, CategoryRequest request) {
    jdbc.update("INSERT INTO biz_product_category(id, tenant_id, category_name, sort_order) VALUES (?, ?, ?, ?)",
        id, tenantId, request.categoryName(), request.sortOrder());
  }

  public void update(long tenantId, long id, CategoryRequest request) {
    jdbc.update("""
        UPDATE biz_product_category SET category_name = ?, sort_order = ?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, request.categoryName(), request.sortOrder(), tenantId, id);
  }

  public void renameProductReferences(long tenantId, String oldName, String newName) {
    jdbc.update("""
        UPDATE biz_product SET category = ?, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND category = ? AND deleted = 0
        """, newName, tenantId, oldName);
  }

  public boolean isUsed(long tenantId, String name) {
    Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM biz_product WHERE tenant_id = ? AND category = ? AND deleted = 0",
        Integer.class, tenantId, name);
    return count != null && count > 0;
  }

  public void delete(long tenantId, long id) {
    jdbc.update("""
        UPDATE biz_product_category SET deleted = 1, updated_time = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ? AND deleted = 0
        """, tenantId, id);
  }
}
