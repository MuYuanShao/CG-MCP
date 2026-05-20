package com.spd.mcp.api.purchase;

import com.spd.mcp.api.tenant.TenantContext;
import com.spd.mcp.api.common.PageResult;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseService {
  private final PurchaseRepository purchaseRepository;
  private final TenantContext tenantContext;

  public PurchaseService(PurchaseRepository purchaseRepository, TenantContext tenantContext) {
    this.purchaseRepository = purchaseRepository;
    this.tenantContext = tenantContext;
  }

  public List<BusinessDocumentDto> plans() {
    return purchaseRepository.plans(tenantContext.currentTenantId());
  }

  public List<BusinessDocumentDto> orders(PurchaseOrderSearchRequest request) {
    return purchaseRepository.orders(tenantContext.currentTenantId(), request);
  }

  public PageResult<DeliveryEditItemDto> orderItems(long orderId, PurchaseOrderItemSearchRequest request) {
    long current = Math.max(1, request == null ? 1 : request.current());
    long size = Math.min(50, Math.max(1, request == null ? 10 : request.size()));
    PurchaseOrderItemSearchRequest normalized = new PurchaseOrderItemSearchRequest(
        request == null ? null : request.productCode(),
        request == null ? null : request.productName(),
        request == null ? null : request.batchNo(),
        request == null ? null : request.manufacturer(),
        current,
        size);
    return purchaseRepository.orderItems(tenantContext.currentTenantId(), orderId, normalized);
  }

  public List<BusinessDocumentDto> deliveries() {
    return purchaseRepository.deliveries(tenantContext.currentTenantId());
  }

  public List<BusinessDocumentDto> shipments() {
    return purchaseRepository.shipments(tenantContext.currentTenantId());
  }

  @Transactional
  public DeliveryEditDto getOrCreateDeliveryEditByPlanNo(String planNo) {
    return purchaseRepository.getOrCreateDeliveryEditByPlanNo(tenantContext.currentTenantId(), planNo);
  }

  @Transactional
  public BusinessDocumentDto confirmOrder(long orderId) {
    return purchaseRepository.confirmOrder(tenantContext.currentTenantId(), orderId);
  }

  @Transactional
  public DeliveryEditDto getOrCreateDeliveryEditByOrderId(long orderId) {
    return purchaseRepository.getOrCreateDeliveryEditByOrderId(tenantContext.currentTenantId(), orderId);
  }

  @Transactional
  public DeliveryEditDto saveDeliveryEdit(long deliveryId, DeliveryEditSaveRequest request) {
    return purchaseRepository.saveDeliveryEdit(tenantContext.currentTenantId(), deliveryId, request);
  }

  @Transactional
  public void submitDelivery(long deliveryId) {
    purchaseRepository.submitDelivery(tenantContext.currentTenantId(), deliveryId);
  }

  @Transactional
  public void deleteDeliveries(List<Long> ids) {
    purchaseRepository.deleteDeliveries(tenantContext.currentTenantId(), ids);
  }

  @Transactional
  public BusinessDocumentDto getOrCreateShipmentByDeliveryId(long deliveryId) {
    return purchaseRepository.getOrCreateShipmentByDeliveryId(tenantContext.currentTenantId(), deliveryId);
  }

  @Transactional
  public BusinessDocumentDto outboundShipment(long shipmentId) {
    return purchaseRepository.updateShipmentStatus(tenantContext.currentTenantId(), shipmentId, 0, 1, "仅待出库发货单允许出库");
  }

  @Transactional
  public BusinessDocumentDto signShipment(long shipmentId) {
    return purchaseRepository.updateShipmentStatus(tenantContext.currentTenantId(), shipmentId, 1, 3, "仅已出库发货单允许签收");
  }

  @Transactional
  public void deleteShipments(List<Long> ids) {
    purchaseRepository.deleteShipments(tenantContext.currentTenantId(), ids);
  }
}
