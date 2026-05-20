package com.spd.mcp.api.refund;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.common.DbIdGenerator;
import com.spd.mcp.api.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {
  @Mock
  private RefundRepository refundRepository;
  @Mock
  private DbIdGenerator idGenerator;

  private final TenantContext tenantContext = new TenantContext(1L);

  @Test
  void createAllocatesIdAndResolvesReferencesBeforeInsert() {
    RefundService refundService = new RefundService(refundRepository, tenantContext, idGenerator);
    RefundRequest request = new RefundRequest(
        "PO202604120001",
        "测试医院",
        "测试商品",
        "B20240215",
        1,
        BigDecimal.ONE,
        "测试原因",
        LocalDate.now());
    when(idGenerator.nextId("biz_refund")).thenReturn(20L);
    when(refundRepository.findHospitalIdByName(1L, "测试医院")).thenReturn(Optional.of(2L));
    when(refundRepository.findProductIdByName(1L, "测试商品")).thenReturn(Optional.of(3L));
    when(refundRepository.findOrderIdByNo(1L, "PO202604120001")).thenReturn(Optional.of(4L));
    when(refundRepository.findById(1L, 20L)).thenReturn(Optional.of(refund(20L, RefundStatus.PENDING_AUDIT)));

    refundService.create(request);

    verify(refundRepository).insert(1L, 20L, "TH" + LocalDate.now().toString().replace("-", "") + "0020", 2L, 3L, 4L, request);
  }

  @Test
  void approveUsesExpectedStatusInUpdate() {
    RefundService refundService = new RefundService(refundRepository, tenantContext, idGenerator);
    when(refundRepository.findStatus(1L, 10L)).thenReturn(Optional.of(RefundStatus.PENDING_AUDIT));
    when(refundRepository.updateStatus(1L, 10L, RefundStatus.PENDING_AUDIT, RefundStatus.APPROVED)).thenReturn(1);
    when(refundRepository.findById(1L, 10L)).thenReturn(Optional.of(refund(10L, RefundStatus.APPROVED)));

    refundService.approve(10L);

    verify(refundRepository).updateStatus(1L, 10L, RefundStatus.PENDING_AUDIT, RefundStatus.APPROVED);
  }

  @Test
  void approveRejectsInvalidCurrentStatusBeforeUpdate() {
    RefundService refundService = new RefundService(refundRepository, tenantContext, idGenerator);
    when(refundRepository.findStatus(1L, 10L)).thenReturn(Optional.of(RefundStatus.APPROVED));

    assertThatThrownBy(() -> refundService.approve(10L))
        .isInstanceOf(BusinessException.class)
        .hasMessage("仅待审核退货单允许审核通过");

    verify(refundRepository, never()).updateStatus(1L, 10L, RefundStatus.PENDING_AUDIT, RefundStatus.APPROVED);
  }

  private RefundDto refund(long id, RefundStatus status) {
    return new RefundDto(
        id,
        "TH202604180001",
        "测试医院",
        "PO202604120001",
        "测试商品",
        "B20240215",
        1,
        BigDecimal.ONE,
        "测试原因",
        LocalDate.now(),
        status.key());
  }
}
