package com.spd.mcp.api.category;

import com.spd.mcp.api.auth.RequirePermission;
import com.spd.mcp.api.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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
@RequestMapping("/api/product-categories")
public class CategoryController {
  private final CategoryService service;

  public CategoryController(CategoryService service) {
    this.service = service;
  }

  @GetMapping
  public ApiResponse<List<CategoryDto>> list() {
    return ApiResponse.success(service.findAll());
  }

  @PostMapping
  @RequirePermission("categories:manage")
  public ApiResponse<CategoryDto> create(@Valid @RequestBody CategoryRequest request) {
    return ApiResponse.success(service.create(request));
  }

  @PutMapping("/{id}")
  @RequirePermission("categories:manage")
  public ApiResponse<CategoryDto> update(@PathVariable long id, @Valid @RequestBody CategoryRequest request) {
    return ApiResponse.success(service.update(id, request));
  }

  @DeleteMapping
  @RequirePermission("categories:manage")
  public ApiResponse<Map<String, Integer>> delete(@Valid @RequestBody DeleteRequest request) {
    return ApiResponse.success(Map.of("deleted", service.delete(request.ids())));
  }

  public record DeleteRequest(@NotNull @Size(min = 1, max = 100) List<@NotNull @Positive Long> ids) {}
}
