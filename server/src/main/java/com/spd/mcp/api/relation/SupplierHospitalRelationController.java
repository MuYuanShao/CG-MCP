package com.spd.mcp.api.relation;

import com.spd.mcp.api.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SupplierHospitalRelationController {
  private final SupplierHospitalRelationService service;

  public SupplierHospitalRelationController(SupplierHospitalRelationService service) {
    this.service = service;
  }

  @GetMapping("/hospitals/{hospitalId}/suppliers")
  public ApiResponse<Map<String, List<Long>>> supplierIdsByHospital(@PathVariable long hospitalId) {
    return ApiResponse.success(Map.of("ids", service.findSupplierIdsByHospital(hospitalId)));
  }

  @PutMapping("/hospitals/{hospitalId}/suppliers")
  public ApiResponse<Map<String, List<Long>>> replaceSuppliersForHospital(
      @PathVariable long hospitalId,
      @Valid @RequestBody RelationIdsRequest request
  ) {
    List<Long> ids = request.ids() == null ? List.of() : request.ids();
    return ApiResponse.success(Map.of("ids", service.replaceSuppliersForHospital(hospitalId, ids)));
  }

  @GetMapping("/suppliers/{supplierId}/hospitals")
  public ApiResponse<Map<String, List<Long>>> hospitalIdsBySupplier(@PathVariable long supplierId) {
    return ApiResponse.success(Map.of("ids", service.findHospitalIdsBySupplier(supplierId)));
  }

  @GetMapping("/suppliers/hospitals")
  public ApiResponse<Map<Long, List<Long>>> hospitalIdsBySuppliers() {
    return ApiResponse.success(service.findHospitalIdsBySuppliers());
  }

  @PutMapping("/suppliers/{supplierId}/hospitals")
  public ApiResponse<Map<String, List<Long>>> replaceHospitalsForSupplier(
      @PathVariable long supplierId,
      @Valid @RequestBody RelationIdsRequest request
  ) {
    List<Long> ids = request.ids() == null ? List.of() : request.ids();
    return ApiResponse.success(Map.of("ids", service.replaceHospitalsForSupplier(supplierId, ids)));
  }

  @PutMapping("/suppliers/hospitals")
  public ApiResponse<Map<Long, List<Long>>> replaceHospitalsForSuppliers(
      @Valid @RequestBody SupplierHospitalsRequest request
  ) {
    List<Long> supplierIds = request.supplierIds() == null ? List.of() : request.supplierIds();
    List<Long> hospitalIds = request.hospitalIds() == null ? List.of() : request.hospitalIds();
    return ApiResponse.success(service.replaceHospitalsForSuppliers(supplierIds, hospitalIds));
  }
}
