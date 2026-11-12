package com.spd.mcp.api.integration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.auth.RequirePermission;
import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.ApiFailure;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.tenant.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
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
  private final OrderReceiveLogService orderLogs;
  private final ObjectMapper mapper;
  private final Validator validator;
  private static final int MAX_ORDER_BYTES = 2 * 1024 * 1024;
  public IntegrationController(IntegrationService service,IntegrationReportService reports,IntegrationRepository repo,TenantContext tenant,Environment environment,
      OrderReceiveLogService orderLogs,ObjectMapper mapper,Validator validator) {
    this.service=service;this.reports=reports;this.repo=repo;this.tenant=tenant;this.environment=environment;
    this.orderLogs=orderLogs;this.mapper=mapper;this.validator=validator;
  }
  @GetMapping("/instances") public Object instances() {return ApiResponse.success(service.instances());}
  @PostMapping("/instances") @RequirePermission("integration:manage")
  public Object create(@Valid @RequestBody InstanceRequest request) {return ApiResponse.success(service.saveInstance(null,request));}
  @PutMapping("/instances/{id}") @RequirePermission("integration:manage")
  public Object update(@PathVariable String id,@Valid @RequestBody InstanceRequest request) {return ApiResponse.success(service.saveInstance(id,request));}
  @GetMapping("/instances/{id}/records/{kind}")
  public Object records(@PathVariable String id,@PathVariable String kind) {return ApiResponse.success(service.records(id,kind));}
  @GetMapping("/instances/{id}/logs") public Object logs(@PathVariable String id) {return ApiResponse.success(service.logs(id));}
  @GetMapping("/instances/{id}/order-receive-logs")
  public Object orderReceiveLogs(@PathVariable String id, @RequestParam(defaultValue="") String orderNo,
      @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
    return ApiResponse.success(orderLogs.failures(id, orderNo, page, size));
  }
  @GetMapping("/instances/{id}/order-receive-logs/{logId}")
  public Object orderReceiveLogDetail(@PathVariable String id, @PathVariable String logId) {
    return ApiResponse.success(orderLogs.detail(id, logId));
  }
  @PostMapping("/instances/{id}/dispatch") @RequirePermission("integration:manage")
  public Object dispatch(@PathVariable String id,@Valid @RequestBody DispatchRequest request) {return ApiResponse.success(service.dispatch(id,request));}
  @PostMapping("/logs/{id}/retry") @RequirePermission("integration:manage")
  public Object retry(@PathVariable String id) {return ApiResponse.success(service.retry(id));}
  @PostMapping("/instances/{id}/upload/{kind}") @RequirePermission("integration:upload")
  public Object uploadMaster(@PathVariable String id,@PathVariable String kind,@RequestHeader("x-spd-token") String token,@Valid @RequestBody MasterRequest request) {
    authorizeInstance(id,token);return ApiResponse.success(service.uploadMaster(id,kind,request));
  }
  @PostMapping("/instances/{id}/orders") @RequirePermission("integration:upload")
  public Object uploadOrder(@PathVariable String id,
      @RequestHeader(value="x-spd-token", required=false) String token,HttpServletRequest request) {
    JsonNode parameters = null;
    try {
      authorizeInstance(id,token);
      parameters = readOrderParameters(request);
      if (parameters == null || !parameters.isObject())
        throw new BusinessException("ORDER_JSON_INVALID","订单请求必须为JSON对象");
      OrderRequest order;
      try {
        order = mapper.treeToValue(parameters, OrderRequest.class);
      } catch (JsonProcessingException e) {
        throw new BusinessException("ORDER_FIELDS_INVALID","订单请求字段格式不正确");
      }
      var violations = validator.validate(order);
      if (!violations.isEmpty()) {
        var failure = violations.iterator().next();
        throw new BusinessException("VALIDATION_FAILED", failure.getPropertyPath() + "：" + failure.getMessage());
      }
      return ApiResponse.success(service.uploadOrder(id,order));
    } catch (IOException e) {
      var failure = new BusinessException("ORDER_READ_FAILED", "订单请求正文读取失败");
      recordOrderFailure(id, parameters, failure);
      throw failure;
    } catch (RuntimeException e) {
      // This code is only raised after the caller's tenant and instance were verified.
      if (e instanceof BusinessException business && "SPD_TOKEN_INVALID".equals(business.getCode())) {
        try {
          parameters = readOrderParameters(request);
        } catch (IOException | BusinessException ignored) {
          // Unavailable parameters must not change the original 401 response.
        }
      }
      recordOrderFailure(id, parameters, e);
      throw e;
    }
  }

  private JsonNode readOrderParameters(HttpServletRequest request) throws IOException {
    byte[] body = request.getInputStream().readNBytes(MAX_ORDER_BYTES + 1);
    if (body.length > MAX_ORDER_BYTES)
      throw new BusinessException("ORDER_BODY_TOO_LARGE","订单请求超过2MB",HttpStatus.PAYLOAD_TOO_LARGE);
    try {
      return mapper.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
          .with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(body);
    } catch (JsonProcessingException e) {
      throw new BusinessException("ORDER_JSON_INVALID","无法解析订单请求JSON");
    }
  }

  private void recordOrderFailure(String instance, JsonNode parameters, RuntimeException error) {
    var failure = ApiFailure.from(error);
    orderLogs.recordRejected(instance, parameters, failure.status().value(), failure.code(), failure.message());
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
    if(expected==null || expected.isBlank() || token==null || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),token.getBytes(StandardCharsets.UTF_8)))
      throw new BusinessException("SPD_TOKEN_INVALID","实例鉴权失败",HttpStatus.UNAUTHORIZED);
  }
}
