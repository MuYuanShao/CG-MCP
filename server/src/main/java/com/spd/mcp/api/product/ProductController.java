package com.spd.mcp.api.product;

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
@RequestMapping("/api/products")
public class ProductController {
  private final ProductService productService;

  public ProductController(ProductService productService) {
    this.productService = productService;
  }

  @GetMapping
  public ApiResponse<List<ProductDto>> list() {
    return ApiResponse.success(productService.findAll());
  }

  @PostMapping
  public ApiResponse<ProductDto> create(@Valid @RequestBody ProductRequest request) {
    return ApiResponse.success(productService.create(request));
  }

  @PutMapping("/{id}")
  public ApiResponse<ProductDto> update(@PathVariable long id, @Valid @RequestBody ProductRequest request) {
    return ApiResponse.success(productService.update(id, request));
  }

  @DeleteMapping
  public ApiResponse<Map<String, Object>> delete(@RequestBody Map<String, List<Long>> request) {
    List<Long> ids = request.getOrDefault("ids", List.of());
    productService.delete(ids);
    return ApiResponse.success(Map.of("deleted", ids.size()));
  }
}
