package com.spd.mcp.api.hospital;

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
@RequestMapping("/api/hospitals")
public class HospitalController {
  private final HospitalService hospitalService;

  public HospitalController(HospitalService hospitalService) {
    this.hospitalService = hospitalService;
  }

  @GetMapping
  public ApiResponse<List<HospitalDto>> list() {
    return ApiResponse.success(hospitalService.findAll());
  }

  @PostMapping
  public ApiResponse<HospitalDto> create(@Valid @RequestBody HospitalRequest request) {
    return ApiResponse.success(hospitalService.create(request));
  }

  @PutMapping("/{id}")
  public ApiResponse<HospitalDto> update(@PathVariable long id, @Valid @RequestBody HospitalRequest request) {
    return ApiResponse.success(hospitalService.update(id, request));
  }

  @DeleteMapping
  public ApiResponse<Map<String, Object>> delete(@RequestBody Map<String, List<Long>> request) {
    List<Long> ids = request.getOrDefault("ids", List.of());
    hospitalService.delete(ids);
    return ApiResponse.success(Map.of("deleted", ids.size()));
  }
}
