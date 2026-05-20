package com.spd.mcp.api.purchase;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.spd.mcp.api.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PurchaseServiceTest {
  @Mock
  private PurchaseRepository purchaseRepository;

  private final TenantContext tenantContext = new TenantContext(1L);

  @Test
  void purchaseDocumentCreationChainUsesCurrentTenant() {
    PurchaseService service = new PurchaseService(purchaseRepository, tenantContext);
    BusinessDocumentDto order = document(10L, "PO202605070001", 1);
    DeliveryEditDto deliveryEdit = deliveryEdit(20L);
    BusinessDocumentDto shipment = document(30L, "FH202605070001", 0);
    BusinessDocumentDto outboundShipment = document(30L, "FH202605070001", 1);
    BusinessDocumentDto signedShipment = document(30L, "FH202605070001", 3);

    when(purchaseRepository.confirmOrder(1L, 10L)).thenReturn(order);
    when(purchaseRepository.getOrCreateDeliveryEditByOrderId(1L, 10L)).thenReturn(deliveryEdit);
    when(purchaseRepository.saveDeliveryEdit(1L, 20L, saveRequest())).thenReturn(deliveryEdit);
    when(purchaseRepository.getOrCreateShipmentByDeliveryId(1L, 20L)).thenReturn(shipment);
    when(purchaseRepository.updateShipmentStatus(1L, 30L, 0, 1, "仅待出库发货单允许出库")).thenReturn(outboundShipment);
    when(purchaseRepository.updateShipmentStatus(1L, 30L, 1, 3, "仅已出库发货单允许签收")).thenReturn(signedShipment);

    service.confirmOrder(10L);
    service.getOrCreateDeliveryEditByOrderId(10L);
    service.saveDeliveryEdit(20L, saveRequest());
    service.submitDelivery(20L);
    service.getOrCreateShipmentByDeliveryId(20L);
    service.outboundShipment(30L);
    service.signShipment(30L);

    verify(purchaseRepository).confirmOrder(1L, 10L);
    verify(purchaseRepository).getOrCreateDeliveryEditByOrderId(1L, 10L);
    verify(purchaseRepository).saveDeliveryEdit(1L, 20L, saveRequest());
    verify(purchaseRepository).submitDelivery(1L, 20L);
    verify(purchaseRepository).getOrCreateShipmentByDeliveryId(1L, 20L);
    verify(purchaseRepository).updateShipmentStatus(1L, 30L, 0, 1, "仅待出库发货单允许出库");
    verify(purchaseRepository).updateShipmentStatus(1L, 30L, 1, 3, "仅已出库发货单允许签收");
  }

  private DeliveryEditSaveRequest saveRequest() {
    return new DeliveryEditSaveRequest(
        LocalDate.now(),
        "测试配送",
        false,
        List.of(new DeliveryEditItemRequest(1L, 1L, 10, 10, LocalDate.now(), LocalDate.now().plusYears(1), "B20260507", "")));
  }

  private BusinessDocumentDto document(long id, String documentNo, int status) {
    return new BusinessDocumentDto(
        id,
        documentNo,
        "",
        "测试医院",
        "测试商品",
        10,
        BigDecimal.ONE,
        LocalDate.now(),
        String.valueOf(status));
  }

  private DeliveryEditDto deliveryEdit(long id) {
    return new DeliveryEditDto(
        1L,
        "PL202605070001",
        10L,
        "PO202605070001",
        id,
        "DL202605070001",
        LocalDate.now(),
        "draft",
        "",
        List.of());
  }
}
