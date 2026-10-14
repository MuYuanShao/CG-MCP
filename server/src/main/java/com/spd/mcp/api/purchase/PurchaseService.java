package com.spd.mcp.api.purchase;

import com.spd.mcp.api.approval.ApprovalAccessService;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.tenant.TenantContext;
import com.spd.mcp.api.common.PageResult;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseService {
  private final PurchaseRepository purchaseRepository;
  private final TenantContext tenantContext;
  private final ApprovalAccessService approvalAccessService;

  public PurchaseService(
      PurchaseRepository purchaseRepository,
      TenantContext tenantContext,
      ApprovalAccessService approvalAccessService
  ) {
    this.purchaseRepository = purchaseRepository;
    this.tenantContext = tenantContext;
    this.approvalAccessService = approvalAccessService;
  }

  public List<BusinessDocumentDto> plans() {
    boolean canOperate = approvalAccessService.canOperate(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW);
    return purchaseRepository.plans(tenantContext.currentTenantId()).stream()
        .map(plan -> plan.withCapabilities(
            canOperate && "pending_approval".equals(plan.status()),
            switch (plan.status()) {
              case "pending_approval" -> canOperate;
              case "draft", "rejected", "pending_order" -> true;
              default -> false;
            }))
        .toList();
  }

  @Transactional
  public void updatePlan(long planId, PurchasePlanUpdateRequest request) {
    long tenantId = tenantContext.currentTenantId();
    int status = purchaseRepository.findPlanStatus(tenantId, planId)
        .orElseThrow(() -> new BusinessException("PLAN_NOT_FOUND", "采购计划不存在", HttpStatus.NOT_FOUND));
    if (status == 1) {
      approvalAccessService.requireOperation(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW);
    }
    if (status < 0 || status > 3) {
      throw new BusinessException("PLAN_EDIT_STATUS_INVALID", "当前采购计划状态不允许修改");
    }
    purchaseRepository.updatePlan(tenantId, planId, request,status);
  }

  @Transactional
  public void submitPlan(long planId) {purchaseRepository.submitPlan(tenantContext.currentTenantId(),planId);}

  @Transactional
  public void approvePlan(long planId) {
    approvalAccessService.requireOperation(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW);
    purchaseRepository.updatePlanApprovalStatus(tenantContext.currentTenantId(), planId, 3);
  }

  @Transactional
  public void rejectPlan(long planId) {
    approvalAccessService.requireOperation(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW);
    purchaseRepository.updatePlanApprovalStatus(tenantContext.currentTenantId(), planId, 2);
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
    long tenantId = tenantContext.currentTenantId();
    int status = purchaseRepository.findPlanStatusByNo(tenantId, planNo)
        .orElseThrow(() -> new BusinessException("PLAN_NOT_FOUND", "采购计划不存在", HttpStatus.NOT_FOUND));
    if (status == 1) {
      approvalAccessService.requireOperation(ApprovalAccessService.PURCHASE_PLAN_WORKFLOW);
      throw new BusinessException("PLAN_APPROVAL_REQUIRED", "采购计划审批通过后才能转订单");
    }
    if (status != 3 && status != 4) {
      throw new BusinessException("PLAN_STATUS_INVALID", "当前采购计划状态不允许转订单");
    }
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
