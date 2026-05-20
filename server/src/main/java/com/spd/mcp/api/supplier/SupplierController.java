package com.spd.mcp.api.supplier;

import com.spd.mcp.api.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {
  private final SupplierService supplierService;

  public SupplierController(SupplierService supplierService) {
    this.supplierService = supplierService;
  }

  @GetMapping
  public ApiResponse<List<SupplierDto>> list() {
    return ApiResponse.success(supplierService.findAll());
  }

  @PostMapping
  public ApiResponse<SupplierDto> create(@Valid @RequestBody SupplierRequest request) {
    return ApiResponse.success(supplierService.create(request));
  }

  @PutMapping("/{id}")
  public ApiResponse<SupplierDto> update(@PathVariable long id, @Valid @RequestBody SupplierRequest request) {
    return ApiResponse.success(supplierService.update(id, request));
  }

  @DeleteMapping
  public ApiResponse<Map<String, Object>> delete(@RequestBody Map<String, List<Long>> request) {
    List<Long> ids = request.getOrDefault("ids", List.of());
    supplierService.delete(ids);
    return ApiResponse.success(Map.of("deleted", ids.size()));
  }
}
