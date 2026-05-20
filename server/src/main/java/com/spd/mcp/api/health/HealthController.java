package com.spd.mcp.api.health;

import com.spd.mcp.api.common.ApiResponse;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {
  private final JdbcTemplate jdbcTemplate;

  public HealthController(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @GetMapping
  public ApiResponse<Map<String, Object>> health() {
    Integer ok = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
    return ApiResponse.success(Map.of("ok", ok != null && ok == 1, "service", "spd-api", "runtime", "spring-boot"));
  }
}
