package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.product.ProductRepository;
import com.spd.mcp.api.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

@ExtendWith(MockitoExtension.class)
class IntegrationServiceTest {
  @Mock IntegrationRepository repo;
  @Mock ProductRepository products;
  @Mock JdbcTemplate db;
  @Mock SpdTransport transport;
  @Mock PlatformTransactionManager transactionManager;
  final ObjectMapper mapper=new ObjectMapper().findAndRegisterModules();
  final Instant now=Instant.parse("2026-10-08T00:00:00Z");
  IntegrationService service;
  final Instance instance=new Instance("one","测试医院","H001","http://localhost:1818/api/mcp/receive","SPD_PR_TEST_TOKEN",true);
  @BeforeEach void setup() {service=new IntegrationService(repo,new TenantContext(7),products,db,mapper,transport,"uploads/licenses",transactionManager,mock(Phase2Service.class));}
  OrderItem line(String id,String product,String unit,String quantity,String amount) {return new OrderItem(id,product,new BigDecimal(quantity),unit,new BigDecimal("2"),new BigDecimal(amount));}
  OrderRequest order(String state,Instant timestamp,List<OrderItem> items,String total) {return new OrderRequest("PO1","S1",LocalDate.of(2026,10,8),state,new BigDecimal(total),"CNY",true,timestamp,items);}
  @Test void uploadsMasterWithinTenantAndInstance() {
    when(repo.instance(7,"one",true)).thenReturn(instance);
    var request=new MasterRequest("S1","供应商","credit","联系人","10086","inactive",now);
    service.uploadMaster("one","supplier",request);
    verify(repo).saveRecord(7,"one","supplier","S1",now.toString(),request);
  }
  @Test void olderMasterCannotOverwriteNewer() {
    when(repo.instance(7,"one",true)).thenReturn(instance);
    when(repo.record(7,"one","supplier","S1")).thenReturn(Optional.of(new StoredRecord("one","supplier","S1",now.toString(),mapper.createObjectNode())));
    var old=new MasterRequest("S1","旧名称",null,null,null,"active",now.minusSeconds(1));
    service.uploadMaster("one","supplier",old);
    verify(repo,never()).saveRecord(anyLong(),anyString(),anyString(),anyString(),anyString(),any());
    verify(repo).log(eq(7L),eq("one"),anyString(),eq("upload"),eq("supplier"),eq("S1"),eq("ignored"),anyString(),eq(old));
  }
  @Test void duplicateOrderDoesNotRequireRelationsAgain() {
    when(repo.instance(7,"one",true)).thenReturn(instance);
    var request=order("submitted",now,List.of(line("L1","P1","支","1","2")),"2");
    when(repo.record(7,"one","order","PO1")).thenReturn(Optional.of(new StoredRecord("one","order","PO1",now.toString(),mapper.valueToTree(request))));
    service.uploadOrder("one",request);
    verify(repo,never()).saveRecord(anyLong(),anyString(),anyString(),anyString(),anyString(),any());
    verify(repo,never()).mappedProduct(anyLong(),anyString(),anyString());
  }
  @Test void missingProductKeepsWholeOrderPendingWithoutPartialSave() {
    when(repo.instance(7,"one",true)).thenReturn(instance);
    when(repo.record(7,"one","order","PO1")).thenReturn(Optional.empty());
    when(repo.record(7,"one","supplier","S1")).thenReturn(Optional.of(new StoredRecord("one","supplier","S1",now.toString(),mapper.createObjectNode())));
    var request=order("submitted",now,List.of(line("L1","P1","支","1","2")),"2");
    service.uploadOrder("one",request);
    verify(repo,never()).saveRecord(anyLong(),anyString(),anyString(),anyString(),anyString(),any());
    verify(repo).log(eq(7L),eq("one"),anyString(),eq("upload"),eq("order"),eq("PO1"),eq("failed"),contains("商品未匹配"),eq(request));
  }
  @Test void duplicateLinesAndTotalMismatchFail() {
    var one=line("L1","P1","支","1","2");
    assertThrows(BusinessException.class,()->IntegrationRules.validateOrder(order("submitted",now,List.of(one,one),"4")));
    assertThrows(BusinessException.class,()->IntegrationRules.validateOrder(order("submitted",now,List.of(one),"3")));
  }
  @Test void completeOrderAndNewerCancellationReplaceOnlyValidatedSnapshots() {
    when(repo.instance(7,"one",true)).thenReturn(instance);
    when(repo.record(7,"one","order","PO1")).thenReturn(Optional.empty());
    when(repo.record(7,"one","supplier","S1")).thenReturn(Optional.of(new StoredRecord("one","supplier","S1",now.toString(),mapper.createObjectNode())));
    when(repo.mappedProduct(7,"one","P1")).thenReturn(Optional.of(12L));
    var product=mapper.convertValue(Map.of("id",12,"unit","支"),com.spd.mcp.api.product.ProductDto.class);
    when(products.findById(7,12)).thenReturn(Optional.of(product));
    var original=order("submitted",now,List.of(line("L1","P1","支","1","2")),"2");
    service.uploadOrder("one",original);
    verify(repo).saveRecord(7,"one","order","PO1",now.toString(),original);
    var cancelled=order("cancelled",now.plusSeconds(1),original.items(),"2");
    service.uploadOrder("one",cancelled);
    verify(repo).saveRecord(7,"one","order","PO1",now.plusSeconds(1).toString(),cancelled);
  }
  @Test void reportScopeExcludesDraftAndCancelled() {
    assertFalse(IntegrationRules.reportable("draft"));assertFalse(IntegrationRules.reportable("cancelled"));assertTrue(IntegrationRules.reportable("submitted"));
    assertFalse(IntegrationRules.reportable("rejected"));assertFalse(IntegrationRules.reportable("voided"));assertTrue(IntegrationRules.reportable("pending_approval"));
  }
  @Test void disabledInstanceRejectsUploads() {
    when(repo.instance(7,"one",true)).thenReturn(new Instance("one","测试医院","H001",instance.endpoint(),instance.tokenEnv(),false));
    assertThrows(BusinessException.class,()->service.uploadMaster("one","supplier",new MasterRequest("S1","供应商",null,null,null,"active",now)));
    verify(repo,never()).saveRecord(anyLong(),anyString(),anyString(),anyString(),anyString(),any());
  }
  @Test void crossInstanceReceiptCannotUpdateMapping() {
    when(repo.instance(7,"one",true)).thenReturn(instance);
    when(repo.logRow(7,"log")).thenReturn(new SyncLog("log","batch","another","dispatch","product","1","accepted","",""));
    assertThrows(BusinessException.class,()->service.receipt("one","log",new Receipt("processed","","P1")));
    verify(repo,never()).mapProduct(anyLong(),anyString(),anyLong(),anyString(),anyString());
  }
  @Test void endpointsRejectCredentialsAndNonHttpSchemes() {
    assertThrows(BusinessException.class,()->SpdTransport.validateEndpoint("file:///etc/passwd"));
    assertThrows(BusinessException.class,()->SpdTransport.validateEndpoint("https://user:password@example.com/receive"));
    SpdTransport.validateEndpoint("http://localhost:1818/api/mcp/receive");
  }
  @Test void validationAcceptsUploadedAmountRatherThanRecalculatingPrice() {
    assertDoesNotThrow(()->IntegrationRules.validateOrder(order("submitted",now,List.of(line("L1","P1","支","1","1.99")),"1.99")));
  }
}
