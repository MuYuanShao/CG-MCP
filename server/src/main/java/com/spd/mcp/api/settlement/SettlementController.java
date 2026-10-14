package com.spd.mcp.api.settlement;

import com.spd.mcp.api.common.ApiResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SettlementController {
  private final SettlementService settlementService;

  public SettlementController(SettlementService settlementService) {
    this.settlementService = settlementService;
  }

  @GetMapping("/settlements")
  public ApiResponse<List<SettlementDto>> list() {
    return ApiResponse.success(settlementService.list());
  }

  @GetMapping("/settlements/{id}")
  public ApiResponse<SettlementDto> findById(@PathVariable long id) {
    return ApiResponse.success(settlementService.findById(id));
  }

  @GetMapping("/settlements/{id}/items")
  public ApiResponse<List<SettlementItemDto>> findItems(@PathVariable long id) {
    return ApiResponse.success(settlementService.findItems(id));
  }
}
