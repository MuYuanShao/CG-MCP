package com.spd.mcp.api.refund;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefundService {
  private final RefundRepository refundRepository;
  private final TenantContext tenantContext;
  private final DbIdGenerator idGenerator;

  public RefundService(RefundRepository refundRepository, TenantContext tenantContext, DbIdGenerator idGenerator) {
    this.refundRepository = refundRepository;
    this.tenantContext = tenantContext;
    this.idGenerator = idGenerator;
  }

  public List<RefundDto> findLatest() {
    return refundRepository.findLatest(tenantContext.currentTenantId());
  }

  @Transactional
  public List<RefundDto> sync(List<RefundSyncRequest> requests) {
    if (requests == null || requests.isEmpty()) {
      throw new BusinessException("REFUND_SYNC_EMPTY", "同步退货数据不能为空", HttpStatus.BAD_REQUEST);
    }
    long tenantId = tenantContext.currentTenantId();
    return requests.stream().map((request) -> syncOne(tenantId, request)).toList();
  }

  @Transactional
  public RefundDto create(RefundRequest request) {
    long tenantId = tenantContext.currentTenantId();
    long refundId = idGenerator.nextId("biz_refund");
    RefundRefs refs = resolveRefs(tenantId, request);
    String refundNo = "TH" + LocalDate.now().toString().replace("-", "") + String.format("%04d", refundId);
    refundRepository.insert(tenantId, refundId, refundNo, refs.hospitalId(), refs.productId(), refs.orderId(), request);
    return getById(refundId);
  }

  @Transactional
  public RefundDto update(long refundId, RefundRequest request) {
    long tenantId = tenantContext.currentTenantId();
    RefundRefs refs = resolveRefs(tenantId, request);
    int updated = refundRepository.update(tenantId, refundId, refs.hospitalId(), refs.productId(), refs.orderId(), request);
    if (updated != 1) {
      refundRepository.findById(tenantId, refundId)
          .orElseThrow(() -> new BusinessException("REFUND_NOT_FOUND", "退货单不存在", HttpStatus.NOT_FOUND));
      throw new BusinessException("REFUND_STATUS_INVALID", "仅待审核退货单允许编辑");
    }
    return getById(refundId);
  }

  @Transactional
  public RefundDto approve(long refundId) {
    transition(refundId, RefundStatus.PENDING_AUDIT, RefundStatus.APPROVED, "仅待审核退货单允许审核通过");
    return getById(refundId);
  }

  @Transactional
  public RefundDto reject(long refundId) {
    transition(refundId, RefundStatus.PENDING_AUDIT, RefundStatus.REJECTED, "仅待审核退货单允许驳回");
    return getById(refundId);
  }

  @Transactional
  public RefundDto outbound(long refundId) {
    transition(refundId, RefundStatus.APPROVED, RefundStatus.RETURNING, "仅已审核退货单允许退货出库");
    return getById(refundId);
  }

  @Transactional
  public RefundDto complete(long refundId) {
    transition(refundId, RefundStatus.RETURNING, RefundStatus.COMPLETED, "仅退货中单据允许完成");
    return getById(refundId);
  }

  private void transition(long refundId, RefundStatus expected, RefundStatus next, String message) {
    RefundStatus current = refundRepository.findStatus(tenantContext.currentTenantId(), refundId)
        .orElseThrow(() -> new BusinessException("REFUND_NOT_FOUND", "退货单不存在", HttpStatus.NOT_FOUND));
    if (current != expected) {
      throw new BusinessException("REFUND_STATUS_INVALID", message);
    }
    int updated = refundRepository.updateStatus(tenantContext.currentTenantId(), refundId, expected, next);
    if (updated != 1) {
      throw new BusinessException("REFUND_STATUS_INVALID", message);
    }
  }

  private RefundDto getById(long refundId) {
    return refundRepository.findById(tenantContext.currentTenantId(), refundId)
        .orElseThrow(() -> new BusinessException("REFUND_NOT_FOUND", "退货单不存在", HttpStatus.NOT_FOUND));
  }

  private RefundDto syncOne(long tenantId, RefundSyncRequest request) {
    RefundRefs refs = resolveSyncRefs(tenantId, request);
    RefundStatus status = RefundStatus.fromKey(request.status());
    long refundId = refundRepository.findIdByRefundNo(tenantId, request.refundNo())
        .orElseGet(() -> idGenerator.nextId("biz_refund"));
    refundRepository.upsertSynced(
        tenantId,
        refundId,
        request,
        refs.hospitalId(),
        refs.productId(),
        refs.orderId(),
        status);
    return getById(refundId);
  }

  private RefundRefs resolveRefs(long tenantId, RefundRequest request) {
    long hospitalId = refundRepository.findHospitalIdByName(tenantId, request.hospital())
        .orElseThrow(() -> new BusinessException("HOSPITAL_NOT_FOUND", "医院不存在", HttpStatus.NOT_FOUND));
    long productId = refundRepository.findProductIdByName(tenantId, request.productName())
        .orElseThrow(() -> new BusinessException("PRODUCT_NOT_FOUND", "商品不存在", HttpStatus.NOT_FOUND));
    long orderId = refundRepository.findOrderIdByNo(tenantId, request.relatedOrderNo())
        .orElseThrow(() -> new BusinessException("ORDER_NOT_FOUND", "关联订单不存在", HttpStatus.NOT_FOUND));
    return new RefundRefs(hospitalId, productId, orderId);
  }

  private RefundRefs resolveSyncRefs(long tenantId, RefundSyncRequest request) {
    long hospitalId = refundRepository.findHospitalIdByName(tenantId, request.hospital())
        .orElseThrow(() -> new BusinessException("HOSPITAL_NOT_FOUND", "医院不存在，无法同步退货单", HttpStatus.NOT_FOUND));
    long productId = refundRepository.findProductIdByName(tenantId, request.productName())
        .orElseThrow(() -> new BusinessException("PRODUCT_NOT_FOUND", "商品不存在，无法同步退货单", HttpStatus.NOT_FOUND));
    Long orderId = refundRepository.findOrderIdByNo(tenantId, request.relatedOrderNo()).orElse(null);
    return new RefundRefs(hospitalId, productId, orderId);
  }

  private record RefundRefs(long hospitalId, long productId, Long orderId) {}
}
