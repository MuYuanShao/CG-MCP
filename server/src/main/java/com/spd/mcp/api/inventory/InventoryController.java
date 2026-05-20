package com.spd.mcp.api.inventory;

import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.PageResult;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory-ledger")
public class InventoryController {
  private final InventoryService inventoryService;

  public InventoryController(InventoryService inventoryService) {
    this.inventoryService = inventoryService;
  }

  @GetMapping
  public ApiResponse<List<InventoryLedgerDto>> ledger() {
    return ApiResponse.success(inventoryService.ledger());
  }

  @GetMapping("/{productId}/details")
  public ApiResponse<PageResult<InventoryBatchDetailDto>> batchDetails(
      @PathVariable long productId,
      @RequestParam(defaultValue = "1") long current,
      @RequestParam(defaultValue = "10") long size
  ) {
    return ApiResponse.success(inventoryService.batchDetails(productId, current, size));
  }
}
