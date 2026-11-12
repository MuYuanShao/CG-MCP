package com.spd.mcp.api.integration;

import com.spd.mcp.api.auth.RequirePermission;
import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** Supplier-scoped hospital order supply actions, independent of retired native logistics permissions. */
@RestController
@RequestMapping("/api/integration")
@RequirePermission("integration:phase3:read")
public class HospitalSupplyController {
    private final HospitalSupplyService service;
    public HospitalSupplyController(HospitalSupplyService service){this.service=service;}
    private com.fasterxml.jackson.databind.JsonNode body(HttpServletRequest request) throws Exception {
        byte[] bytes=request.getInputStream().readNBytes(2*1024*1024+1);if(bytes.length>2*1024*1024)throw new BusinessException("BODY_TOO_LARGE","供货请求超过2MB");
        try {var json=Phase3Json.MAPPER.readTree(bytes);if(json==null||!json.isObject())throw new BusinessException("BODY_INVALID","供货请求必须为JSON对象");return json;}
        catch(com.fasterxml.jackson.core.JsonProcessingException error){throw new BusinessException("BODY_INVALID","供货JSON格式不合法");}
    }
    @GetMapping("/phase3/supply-capability") public Object capability(){return ApiResponse.success(java.util.Map.of("enabled",service.enabled()));}
    @GetMapping("/instances/{id}/phase3/purchase-orders") public Object orders(@PathVariable String id,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size,@RequestParam(required=false) String query){return ApiResponse.success(service.orders(id,page,size,query));}
    @GetMapping("/instances/{id}/phase3/purchase-orders/{no}/supply-options") public Object options(@PathVariable String id,@PathVariable String no){return ApiResponse.success(service.options(id,no));}
    @GetMapping("/phase3/supply-drafts") @RequirePermission("integration:supply")
    public Object drafts(){return ApiResponse.success(service.drafts());}
    @GetMapping("/phase3/supply-orders") @RequirePermission("integration:supply")
    public Object supplyOrders(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        return ApiResponse.success(service.supplyOrders(page,size));
    }
    @PostMapping("/instances/{id}/phase3/purchase-orders/{no}/supply-draft") @RequirePermission("integration:supply")
    public Object openDraft(@PathVariable String id,@PathVariable String no){return ApiResponse.success(service.openDraft(id,no));}
    @PutMapping("/instances/{id}/phase3/purchase-orders/{no}/supply-draft/{draftId}") @RequirePermission("integration:supply")
    public Object saveDraft(@PathVariable String id,@PathVariable String no,@PathVariable String draftId,HttpServletRequest request) throws Exception {
        return ApiResponse.success(service.saveDraft(id,no,draftId,body(request)));
    }
    @PostMapping("/instances/{id}/phase3/purchase-orders/{no}/supplies") @RequirePermission("integration:supply")
    public Object submit(@PathVariable String id,@PathVariable String no,@RequestHeader("Idempotency-Key") String key,HttpServletRequest request) throws Exception{return ApiResponse.success(service.submit(id,no,key,body(request)));}
    @GetMapping("/instances/{id}/phase3/purchase-orders/{no}/supplies") public Object supplies(@PathVariable String id,@PathVariable String no,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size){return ApiResponse.success(service.supplies(id,no,page,size));}
    @PostMapping("/instances/{id}/phase3/supplies/{key}/refresh") public Object refresh(@PathVariable String id,@PathVariable String key){return ApiResponse.success(service.refresh(id,key));}
    @GetMapping("/instances/{id}/phase3/supplies/{key}/items") public Object items(@PathVariable String id,@PathVariable String key,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size){return ApiResponse.success(service.items(id,key,page,size));}
    @PostMapping("/instances/{id}/phase3/supplies/{key}/retry") @RequirePermission("integration:supply") public Object retry(@PathVariable String id,@PathVariable String key){return ApiResponse.success(service.retry(id,key));}
}
