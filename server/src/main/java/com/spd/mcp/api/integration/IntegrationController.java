package com.spd.mcp.api.integration;

import com.spd.mcp.api.auth.RequirePermission;
import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.tenant.TenantContext;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.*;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

@RestController
@RequestMapping("/api/integration")
@RequirePermission("integration:read")
public class IntegrationController {
  private final IntegrationService service;
  private final IntegrationReportService reports;
  private final IntegrationRepository repo;
  private final TenantContext tenant;
  private final Environment environment;
  public IntegrationController(IntegrationService service,IntegrationReportService reports,IntegrationRepository repo,TenantContext tenant,Environment environment) {this.service=service;this.reports=reports;this.repo=repo;this.tenant=tenant;this.environment=environment;}
  @GetMapping("/instances") public Object instances() {return ApiResponse.success(service.instances());}
  @PostMapping("/instances") @RequirePermission("integration:manage")
  public Object create(@Valid @RequestBody InstanceRequest request) {return ApiResponse.success(service.saveInstance(null,request));}
  @PutMapping("/instances/{id}") @RequirePermission("integration:manage")
  public Object update(@PathVariable String id,@Valid @RequestBody InstanceRequest request) {return ApiResponse.success(service.saveInstance(id,request));}
  @GetMapping("/instances/{id}/records/{kind}")
  public Object records(@PathVariable String id,@PathVariable String kind) {return ApiResponse.success(service.records(id,kind));}
  @GetMapping("/instances/{id}/logs") public Object logs(@PathVariable String id) {return ApiResponse.success(service.logs(id));}
  @PostMapping("/instances/{id}/dispatch") @RequirePermission("integration:manage")
  public Object dispatch(@PathVariable String id,@Valid @RequestBody DispatchRequest request) {return ApiResponse.success(service.dispatch(id,request));}
  @PostMapping("/logs/{id}/retry") @RequirePermission("integration:manage")
  public Object retry(@PathVariable String id) {return ApiResponse.success(service.retry(id));}
  @PostMapping("/instances/{id}/upload/{kind}") @RequirePermission("integration:upload")
  public Object uploadMaster(@PathVariable String id,@PathVariable String kind,@RequestHeader("x-spd-token") String token,@Valid @RequestBody MasterRequest request) {
    authorizeInstance(id,token);return ApiResponse.success(service.uploadMaster(id,kind,request));
  }
  @PostMapping("/instances/{id}/orders") @RequirePermission("integration:upload")
  public Object uploadOrder(@PathVariable String id,@RequestHeader("x-spd-token") String token,@Valid @RequestBody OrderRequest request) {
    authorizeInstance(id,token);return ApiResponse.success(service.uploadOrder(id,request));
  }
  @PostMapping("/instances/{id}/receipts/{syncId}") @RequirePermission("integration:upload")
  public Object receipt(@PathVariable String id,@PathVariable String syncId,@RequestHeader("x-spd-token") String token,@Valid @RequestBody Receipt request) {
    authorizeInstance(id,token);return ApiResponse.success(service.receipt(id,syncId,request));
  }
  @GetMapping("/instances/{id}/report")
  public Object report(@PathVariable String id,
      @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required=false) String supplier,@RequestParam(required=false) String product,@RequestParam(required=false) String manufacturer) {
    if(from!=null && to!=null && from.isAfter(to)) throw new BusinessException("DATE_INVALID","开始日期不能晚于结束日期");
    return ApiResponse.success(reports.report(id,from,to,supplier,product,manufacturer));
  }
  private void authorizeInstance(String id,String token) {
    var instance=repo.instance(tenant.currentTenantId(),id,false);
    String expected=environment.getProperty(instance.tokenEnv());
    if(expected==null || expected.isBlank() || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),token.getBytes(StandardCharsets.UTF_8)))
      throw new BusinessException("SPD_TOKEN_INVALID","实例鉴权失败",HttpStatus.UNAUTHORIZED);
  }
}
