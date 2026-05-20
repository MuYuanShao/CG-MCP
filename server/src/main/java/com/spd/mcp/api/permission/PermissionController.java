package com.spd.mcp.api.permission;

import com.spd.mcp.api.auth.AuthContext;
import com.spd.mcp.api.common.ApiResponse;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/permissions")
public class PermissionController {
  private final AuthContext authContext;

  public PermissionController(AuthContext authContext) {
    this.authContext = authContext;
  }

  @GetMapping("/me/actions")
  public ApiResponse<Map<String, List<String>>> actions() {
    Map<String, List<String>> actions = authContext.currentUser().orElseThrow().permissions().stream()
        .map(permission -> permission.split(":", 2))
        .filter(parts -> parts.length == 2)
        .collect(Collectors.groupingBy(parts -> parts[0], Collectors.mapping(parts -> parts[1], Collectors.toList())));
    return ApiResponse.success(actions);
  }
}
