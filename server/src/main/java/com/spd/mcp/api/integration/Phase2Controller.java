package com.spd.mcp.api.integration;

import com.spd.mcp.api.auth.RequirePermission;
import com.spd.mcp.api.common.*;
import com.spd.mcp.api.tenant.TenantContext;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.core.env.Environment;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import static com.spd.mcp.api.integration.Phase2Types.*;

@RestController
@RequestMapping("/api/integration/instances/{id}/phase2")
@RequirePermission("integration:read")
public class Phase2Controller {
  private final Phase2Service service;
  private final Phase2ReportService reports;
  private final IntegrationRepository repo;
  private final TenantContext tenant;
  private final Environment env;
  public Phase2Controller(Phase2Service service,Phase2ReportService reports,IntegrationRepository repo,TenantContext tenant,Environment env){this.service=service;this.reports=reports;this.repo=repo;this.tenant=tenant;this.env=env;}
  @PostMapping("/receiving") @RequirePermission("integration:upload")
  public Object receiving(@PathVariable String id,@RequestHeader("x-spd-token") String token,@Valid @RequestBody Receiving request){auth(id,token);return ApiResponse.success(service.upload(id,"receiving",request));}
  @PostMapping("/inbound") @RequirePermission("integration:upload")
  public Object inbound(@PathVariable String id,@RequestHeader("x-spd-token") String token,@Valid @RequestBody Inbound request){auth(id,token);return ApiResponse.success(service.upload(id,"inbound",request));}
  @PostMapping("/return") @RequirePermission("integration:upload")
  public Object returned(@PathVariable String id,@RequestHeader("x-spd-token") String token,@Valid @RequestBody PurchaseReturn request){auth(id,token);return ApiResponse.success(service.upload(id,"return",request));}
  @PostMapping("/inventory") @RequirePermission("integration:upload")
  public Object inventory(@PathVariable String id,@RequestHeader("x-spd-token") String token,@Valid @RequestBody Inventory request){auth(id,token);return ApiResponse.success(service.upload(id,"inventory",request));}
  @GetMapping("/report") public Object report(@PathVariable String id,
      @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required=false) String supplier,@RequestParam(required=false) String product,@RequestParam(required=false) String manufacturer,@RequestParam(required=false) String warehouse){
    if(from!=null && to!=null && from.isAfter(to)) throw new BusinessException("DATE_INVALID","开始日期不能晚于结束日期");
    return ApiResponse.success(reports.report(id,from,to,supplier,product,manufacturer,warehouse));
  }
  private void auth(String id,String token){var instance=repo.instance(tenant.currentTenantId(),id,false);String expected=env.getProperty(instance.tokenEnv());
    if(expected==null || expected.isBlank() || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),token.getBytes(StandardCharsets.UTF_8))) throw new BusinessException("SPD_TOKEN_INVALID","实例鉴权失败",HttpStatus.UNAUTHORIZED);}
}
