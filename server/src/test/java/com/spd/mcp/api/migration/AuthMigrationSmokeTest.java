package com.spd.mcp.api.migration;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class AuthMigrationSmokeTest {
  @Test
  void authMigrationKeepsV1CompatibleColumnsAndPermissionResourceType() throws Exception {
    String sql = Files.readString(Path.of("src/main/resources/db/migration/V8__auth_rbac_session.sql"));

    assertThat(sql).contains("real_name VARCHAR(50)");
    assertThat(sql).doesNotContain("display_name");
    assertThat(sql).contains("CREATE TABLE IF NOT EXISTS sys_user_role");
    assertThat(sql).contains("PRIMARY KEY (user_id, role_id)");
    assertThat(sql).contains("permission_name, resource_type");
    assertThat(sql).contains("'ACTION'");
  }

  @Test
  void authCompatibilityMigrationBackfillsRequiredColumns() throws Exception {
    String sql = Files.readString(Path.of("src/main/resources/db/migration/V9__auth_schema_compatibility.sql"));

    assertThat(sql).contains("information_schema.COLUMNS");
    assertThat(sql).contains("COLUMN_NAME = 'password_hash'");
    assertThat(sql).contains("ALTER TABLE sys_user ADD COLUMN password_hash");
    assertThat(sql).contains("COLUMN_NAME = 'real_name'");
    assertThat(sql).contains("ALTER TABLE sys_user ADD COLUMN real_name");
    assertThat(sql).contains("COLUMN_NAME = 'resource_type'");
    assertThat(sql).contains("ALTER TABLE sys_permission ADD COLUMN resource_type");
  }

  @Test
  void sequenceCompatibilityMigrationAvoidsDeprecatedValuesFunction() throws Exception {
    String sql = Files.readString(Path.of("src/main/resources/db/migration/V10__sequence_compatibility_without_values.sql"));

    assertThat(sql).contains("INSERT IGNORE INTO sys_id_sequence");
    assertThat(sql).contains("UPDATE sys_id_sequence s");
    assertThat(sql).contains("JOIN (SELECT");
    assertThat(sql).contains("sys_user_session");
    assertThat(sql).doesNotContain("VALUES(next_id)");
  }
}
