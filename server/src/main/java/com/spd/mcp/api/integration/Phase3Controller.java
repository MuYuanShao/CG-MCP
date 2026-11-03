package com.spd.mcp.api.integration;

import com.spd.mcp.api.auth.RequirePermission;
import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.tenant.TenantContext;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Exposes isolated hospital plan/settlement APIs without granting native purchasing or finance writes. */
@RestController
@RequestMapping("/api/integration")
@RequirePermission("integration:phase3:read")
public class Phase3Controller {
    private final Phase3Service service;private final IntegrationRepository repo;private final TenantContext tenant;private final Environment env;
    public Phase3Controller(Phase3Service service,IntegrationRepository repo,TenantContext tenant,Environment env){this.service=service;this.repo=repo;this.tenant=tenant;this.env=env;}
    private void enabled(){if(!env.getProperty("APP_PHASE3_ENABLED",Boolean.class,false))throw new BusinessException("PHASE3_DISABLED","第三期对接尚未启用",HttpStatus.CONFLICT);}
    private void uploadAuth(String id,String token){enabled();var instance=repo.instance(tenant.currentTenantId(),id,false);String secret=env.getProperty(instance.tokenEnv(),"");if(secret.isBlank()||!MessageDigest.isEqual(secret.getBytes(StandardCharsets.UTF_8),token.getBytes(StandardCharsets.UTF_8)))throw new BusinessException("SPD_TOKEN_INVALID","实例鉴权失败",HttpStatus.UNAUTHORIZED);}
    private JsonNode body(HttpServletRequest request) throws Exception {byte[] bytes=request.getInputStream().readNBytes(2*1024*1024+1);if(bytes.length>2*1024*1024)throw new BusinessException("BODY_TOO_LARGE","第三期请求超过2MB",HttpStatus.PAYLOAD_TOO_LARGE);try{return Phase3Json.MAPPER.readTree(bytes);}catch(Exception error){throw new BusinessException("PAYLOAD_INVALID","第三期JSON格式不合法");}}

    @GetMapping("/phase3/instances") public Object instances(){enabled();return ApiResponse.success(service.instances());}
    @PostMapping("/instances/{id}/phase3/{kind:purchase-plans|settlements}") @RequirePermission("integration:upload")
    public Object upload(@PathVariable String id,@PathVariable String kind,@RequestHeader("x-spd-token") String token,@RequestHeader("Idempotency-Key") String key,HttpServletRequest request) throws Exception {
        uploadAuth(id,token);JsonNode wire=body(request);if(wire.path("payload").path("items").size()>1000)throw new BusinessException("ITEMS_LIMIT","超过1000行请使用大单暂存");return ApiResponse.success(service.upload(id,key,wire,Phase3Service.kind(kind)));
    }
    @PostMapping("/instances/{id}/phase3/upload-sessions") @RequirePermission("integration:upload")
    public Object begin(@PathVariable String id,@RequestHeader("x-spd-token") String token,@RequestHeader("Idempotency-Key") String key,HttpServletRequest request) throws Exception {uploadAuth(id,token);return ApiResponse.success(service.begin(id,key,body(request)));}
    @GetMapping("/instances/{id}/phase3/messages/{message}") @RequirePermission("integration:upload")
    public Object receipt(@PathVariable String id,@PathVariable String message,@RequestHeader("x-spd-token") String token){uploadAuth(id,token);return ApiResponse.success(service.receipt(id,message));}
    @RequestMapping(value="/instances/{id}/phase3/upload-sessions/{session}/parts/{part}",method={RequestMethod.PUT,RequestMethod.POST}) @RequirePermission("integration:upload")
    public Object part(@PathVariable String id,@PathVariable String session,@PathVariable int part,@RequestHeader("x-spd-token") String token,HttpServletRequest request) throws Exception {uploadAuth(id,token);return ApiResponse.success(service.part(id,session,part,body(request)));}
    @PostMapping("/instances/{id}/phase3/upload-sessions/{session}/commit") @RequirePermission("integration:upload")
    public Object commit(@PathVariable String id,@PathVariable String session,@RequestHeader("x-spd-token") String token){uploadAuth(id,token);return ApiResponse.success(service.commit(id,session));}
    @GetMapping("/instances/{id}/phase3/{kind:purchase-plans|settlements}")
    public Object list(@PathVariable String id,@PathVariable String kind,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size,@RequestParam(required=false) String query){enabled();return ApiResponse.success(service.list(id,Phase3Service.kind(kind),page,size,query));}
    @GetMapping("/instances/{id}/phase3/{kind:purchase-plans|settlements}/{source}/items")
    public Object items(@PathVariable String id,@PathVariable String kind,@PathVariable String source,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size){enabled();return ApiResponse.success(service.items(id,Phase3Service.kind(kind),source,page,size));}
    @PostMapping("/instances/{id}/phase3/supplier-access") @RequirePermission("integration:manage")
    public Object supplierAccess(@PathVariable String id,HttpServletRequest request) throws Exception {enabled();return ApiResponse.success(service.supplierAccess(id,body(request)));}
    @PostMapping("/instances/{id}/phase3/settlements/{source}/feedback") @RequirePermission("integration:reconcile")
    public Object feedback(@PathVariable String id,@PathVariable String source,@RequestHeader("Idempotency-Key") String key,HttpServletRequest request) throws Exception {enabled();return ApiResponse.success(service.feedback(id,source,key,body(request)));}
    @GetMapping("/instances/{id}/phase3/settlements/{source}/feedback")
    public Object feedbacks(@PathVariable String id,@PathVariable String source){enabled();return ApiResponse.success(service.feedbacks(id,source));}
}
