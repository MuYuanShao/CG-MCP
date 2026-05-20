package com.spd.mcp.api.refund;

import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.auth.RequirePermission;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/refunds")
public class RefundController {
  private final RefundService refundService;

  public RefundController(RefundService refundService) {
    this.refundService = refundService;
  }

  @GetMapping
  public ApiResponse<List<RefundDto>> list() {
    return ApiResponse.success(refundService.findLatest());
  }

  @PostMapping("/sync")
  @RequirePermission("refunds:create")
  public ApiResponse<List<RefundDto>> sync(@Valid @RequestBody List<@Valid RefundSyncRequest> requests) {
    return ApiResponse.success(refundService.sync(requests));
  }

  @PostMapping
  @RequirePermission("refunds:create")
  public ApiResponse<RefundDto> create(@Valid @RequestBody RefundRequest request) {
    return ApiResponse.success(refundService.create(request));
  }

  @PutMapping("/{id}")
  @RequirePermission("refunds:edit")
  public ApiResponse<RefundDto> update(@PathVariable long id, @Valid @RequestBody RefundRequest request) {
    return ApiResponse.success(refundService.update(id, request));
  }

  @PostMapping("/{id}/approve")
  @RequirePermission("refunds:approve")
  public ApiResponse<RefundDto> approve(@PathVariable long id) {
    return ApiResponse.success(refundService.approve(id));
  }

  @PostMapping("/{id}/reject")
  @RequirePermission("refunds:reject")
  public ApiResponse<RefundDto> reject(@PathVariable long id) {
    return ApiResponse.success(refundService.reject(id));
  }

  @PostMapping("/{id}/outbound")
  @RequirePermission("refunds:outbound")
  public ApiResponse<RefundDto> outbound(@PathVariable long id) {
    return ApiResponse.success(refundService.outbound(id));
  }

  @PostMapping("/{id}/complete")
  @RequirePermission("refunds:complete")
  public ApiResponse<RefundDto> complete(@PathVariable long id) {
    return ApiResponse.success(refundService.complete(id));
  }
}
