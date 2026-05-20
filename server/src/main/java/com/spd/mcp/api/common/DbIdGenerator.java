package com.spd.mcp.api.common;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DbIdGenerator {
  private final JdbcTemplate jdbcTemplate;

  public DbIdGenerator(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public long nextId(String tableName) {
    Long nextId = jdbcTemplate.queryForObject(
        "SELECT next_id FROM sys_id_sequence WHERE table_name = ? FOR UPDATE",
        Long.class,
        tableName);
    if (nextId == null) {
      throw new BusinessException("ID_SEQUENCE_NOT_FOUND", "ID 序列不存在: " + tableName);
    }
    jdbcTemplate.update(
        "UPDATE sys_id_sequence SET next_id = next_id + 1 WHERE table_name = ?",
        tableName);
    return nextId;
  }
}
