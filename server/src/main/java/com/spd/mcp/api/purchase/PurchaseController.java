package com.spd.mcp.api.purchase;

import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.PageResult;
import com.spd.mcp.api.auth.RequirePermission;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PurchaseController {
  private final PurchaseService purchaseService;

  public PurchaseController(PurchaseService purchaseService) {
    this.purchaseService = purchaseService;
  }

  @GetMapping("/purchase-plans")
  public ApiResponse<List<BusinessDocumentDto>> plans() {
    return ApiResponse.success(purchaseService.plans());
  }

  @GetMapping("/purchase-orders")
  public ApiResponse<List<BusinessDocumentDto>> orders(
      @RequestParam(required = false) String orderNo,
      @RequestParam(required = false) String sourcePlan,
      @RequestParam(required = false) String productName,
      @RequestParam(required = false) String hospital,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
  ) {
    return ApiResponse.success(purchaseService.orders(
        new PurchaseOrderSearchRequest(orderNo, sourcePlan, productName, hospital, startDate, endDate)));
  }

  @GetMapping("/purchase-orders/{orderId}/items")
  public ApiResponse<PageResult<DeliveryEditItemDto>> orderItems(
      @PathVariable long orderId,
      @RequestParam(required = false) String productCode,
      @RequestParam(required = false) String productName,
      @RequestParam(required = false) String batchNo,
      @RequestParam(required = false) String manufacturer,
      @RequestParam(defaultValue = "1") long current,
      @RequestParam(defaultValue = "10") long size
  ) {
    return ApiResponse.success(purchaseService.orderItems(
        orderId,
        new PurchaseOrderItemSearchRequest(productCode, productName, batchNo, manufacturer, current, size)));
  }

  @GetMapping("/delivery-orders")
  public ApiResponse<List<BusinessDocumentDto>> deliveries() {
    return ApiResponse.success(purchaseService.deliveries());
  }

  @GetMapping("/shipment-orders")
  public ApiResponse<List<BusinessDocumentDto>> shipments() {
    return ApiResponse.success(purchaseService.shipments());
  }

  @PostMapping("/purchase-plans/{planNo}/delivery-edit")
  public ApiResponse<DeliveryEditDto> createDeliveryEdit(@PathVariable String planNo) {
    return ApiResponse.success(purchaseService.getOrCreateDeliveryEditByPlanNo(planNo));
  }

  @PostMapping("/purchase-orders/{orderId}/confirm")
  @RequirePermission("purchaseOrders:confirm")
  public ApiResponse<BusinessDocumentDto> confirmOrder(@PathVariable long orderId) {
    return ApiResponse.success(purchaseService.confirmOrder(orderId));
  }

  @PostMapping("/purchase-orders/{orderId}/delivery-edit")
  @RequirePermission("purchaseOrders:createDelivery")
  public ApiResponse<DeliveryEditDto> createDeliveryEditByOrder(@PathVariable long orderId) {
    return ApiResponse.success(purchaseService.getOrCreateDeliveryEditByOrderId(orderId));
  }

  @PutMapping("/delivery-orders/{deliveryId}/edit")
  @RequirePermission("deliveryOrders:pick")
  public ApiResponse<DeliveryEditDto> saveDeliveryEdit(
      @PathVariable long deliveryId,
      @Valid @RequestBody DeliveryEditSaveRequest request
  ) {
    return ApiResponse.success(purchaseService.saveDeliveryEdit(deliveryId, request));
  }

  @PostMapping("/delivery-orders/{deliveryId}/submit")
  @RequirePermission("deliveryOrders:pick")
  public ApiResponse<Map<String, Object>> submitDelivery(@PathVariable long deliveryId) {
    purchaseService.submitDelivery(deliveryId);
    return ApiResponse.success(Map.of("submitted", true));
  }

  @DeleteMapping("/delivery-orders")
  public ApiResponse<Map<String, Object>> deleteDeliveries(@RequestBody Map<String, List<Long>> request) {
    List<Long> ids = request.getOrDefault("ids", List.of());
    purchaseService.deleteDeliveries(ids);
    return ApiResponse.success(Map.of("deleted", ids.size()));
  }

  @PostMapping("/delivery-orders/{deliveryId}/shipment")
  @RequirePermission("deliveryOrders:createShipment")
  public ApiResponse<BusinessDocumentDto> createShipment(@PathVariable long deliveryId) {
    return ApiResponse.success(purchaseService.getOrCreateShipmentByDeliveryId(deliveryId));
  }

  @PostMapping("/shipment-orders/{shipmentId}/outbound")
  @RequirePermission("shipmentOrders:outbound")
  public ApiResponse<BusinessDocumentDto> outboundShipment(@PathVariable long shipmentId) {
    return ApiResponse.success(purchaseService.outboundShipment(shipmentId));
  }

  @PostMapping("/shipment-orders/{shipmentId}/sign")
  @RequirePermission("shipmentOrders:sign")
  public ApiResponse<BusinessDocumentDto> signShipment(@PathVariable long shipmentId) {
    return ApiResponse.success(purchaseService.signShipment(shipmentId));
  }

  @DeleteMapping("/shipment-orders")
  public ApiResponse<Map<String, Object>> deleteShipments(@RequestBody Map<String, List<Long>> request) {
    List<Long> ids = request.getOrDefault("ids", List.of());
    purchaseService.deleteShipments(ids);
    return ApiResponse.success(Map.of("deleted", ids.size()));
  }
}
