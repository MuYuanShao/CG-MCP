package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.product.*;
import com.spd.mcp.api.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static com.spd.mcp.api.integration.IntegrationTypes.*;
import static com.spd.mcp.api.integration.Phase2Types.*;

class Phase2ServiceTest {
  final IntegrationRepository repo=mock(IntegrationRepository.class);
  final ProductRepository products=mock(ProductRepository.class);
  final ObjectMapper mapper=new ObjectMapper().findAndRegisterModules();
  final Map<String,StoredRecord> data=new LinkedHashMap<>();
  final Phase2Service service=new Phase2Service(repo,new TenantContext(7),products,mapper);
  final Instant now=Instant.parse("2026-10-08T01:00:00Z");
  final LocalDate date=LocalDate.of(2026,10,8);
  BigDecimal n(String s){return new BigDecimal(s);}
  void seed(String kind,String code,Object value){data.put(kind+":"+code,new StoredRecord("one",kind,code,now.toString(),mapper.valueToTree(value)));}
  @BeforeEach void setup() {
    when(repo.instance(7,"one",true)).thenReturn(new Instance("one","医院","H1","http://localhost/receive","SPD_PR_TOKEN",true));
    when(repo.record(eq(7L),eq("one"),anyString(),anyString())).thenAnswer(a->Optional.ofNullable(data.get(a.getArgument(2)+":"+a.getArgument(3))));
    when(repo.records(eq(7L),eq("one"),anyString())).thenAnswer(a->data.values().stream().filter(r->r.kind().equals(a.getArgument(2))).toList());
    doAnswer(a->{data.put(a.getArgument(2)+":"+a.getArgument(3),new StoredRecord("one",a.getArgument(2),a.getArgument(3),a.getArgument(4),mapper.valueToTree(a.getArgument(5))));return null;}).when(repo).saveRecord(eq(7L),eq("one"),anyString(),anyString(),anyString(),any());
    when(repo.log(anyLong(),anyString(),anyString(),anyString(),anyString(),anyString(),anyString(),anyString(),any())).thenAnswer(a->new SyncLog(UUID.randomUUID().toString(),a.getArgument(2),a.getArgument(1),a.getArgument(3),a.getArgument(4),a.getArgument(5),a.getArgument(6),a.getArgument(7),now.toString()));
    when(repo.mappedProduct(7,"one","P1")).thenReturn(Optional.of(1L));
    when(products.findById(7,1)).thenReturn(Optional.of(mapper.convertValue(Map.of("id",1,"name","测试耗材","unit","支","manufacturer","厂家"),ProductDto.class)));
    seed("order","PO1",new OrderRequest("PO1","S1",date,"approved",n("20"),"CNY",true,now,List.of(new OrderItem("OL1","P1",n("10"),"支",n("2"),n("20")))));
  }
  Receiving receipt(String code,String qty,String qualified,String rejected,Instant version){return new Receiving(code,"PO1","S1","W1","中心库",date,date,"approved",version,List.of(new ReceivingLine("RL1","OL1","P1","支","LOT1",n(qty),n(qualified),n(rejected),"")));}
  Inbound inbound(String qty,Instant version){return new Inbound("IN1","RC1","W1","中心库",date,"completed","CNY",true,version,List.of(new InboundLine("IL1","RL1","P1","支","B1","LOT1",date.minusYears(1),date.plusYears(1),n(qty),n("12"))));}
  PurchaseReturn returned(String code,String qty,String status,Instant version){return new PurchaseReturn(code,"IN1","W1",date,status,"CNY",true,version,List.of(new ReturnLine("TL1","IL1","P1","支","B1",n(qty),n("4"),"质量原因")));}
  void fulfillment(){assertEquals("processed",service.upload("one","receiving",receipt("RC1","8","6","2",now)).state());assertEquals("processed",service.upload("one","inbound",inbound("6",now)).state());}
  @Test void partialReceiptsCannotOverAcceptOriginalOrder() {
    assertEquals("processed",service.upload("one","receiving",receipt("RC1","8","6","2",now)).state());
    assertEquals("failed",service.upload("one","receiving",receipt("RC2","5","5","0",now)).state());
    assertFalse(data.containsKey("receiving:RC2"));
  }
  @Test void invalidLineRejectsEntireDocument() {
    var bad=new Receiving("RC1","PO1","S1","W1","中心库",date,date,"approved",now,List.of(new ReceivingLine("RL1","unknown","P1","支",null,n("1"),n("1"),n("0"),"")));
    assertEquals("failed",service.upload("one","receiving",bad).state());assertFalse(data.containsKey("receiving:RC1"));
  }
  @Test void duplicateAndOlderVersionsCannotReplaceValidatedSnapshot() {
    var valid=receipt("RC1","8","6","2",now);service.upload("one","receiving",valid);
    assertEquals("ignored",service.upload("one","receiving",receipt("RC1","1","1","0",now.minusSeconds(1))).state());
    assertEquals("ignored",service.upload("one","receiving",valid).state());
    assertEquals(0,service.required("one","receiving","RC1",Receiving.class).items().get(0).quantity().compareTo(n("8")));
  }
  @Test void inboundAndReturnAreCappedByTheirOriginalLines() {
    fulfillment();
    assertEquals("failed",service.upload("one","inbound",inbound("7",now.plusSeconds(1))).state());
    assertEquals("processed",service.upload("one","return",returned("RT1","4","completed",now)).state());
    assertEquals("failed",service.upload("one","return",returned("RT2","3","completed",now)).state());
    assertFalse(data.containsKey("return:RT2"));
  }
  @Test void receiptCannotBeReducedBelowExistingInbound() {
    fulfillment();assertEquals("failed",service.upload("one","receiving",receipt("RC1","5","5","0",now.plusSeconds(1))).state());
    assertEquals(0,service.required("one","receiving","RC1",Receiving.class).items().get(0).qualifiedQuantity().compareTo(n("6")));
  }
  @Test void completedDownstreamFreezesPurchaseAndReceivingLineReferences() {
    seed("order","PO1",new OrderRequest("PO1","S1",date,"approved",n("40"),"CNY",true,now,List.of(new OrderItem("OL1","P1",n("10"),"支",n("2"),n("20")),new OrderItem("OL2","P1",n("10"),"支",n("2"),n("20")))));
    fulfillment();
    var rewired=new Receiving("RC1","PO1","S1","W1","中心库",date,date,"approved",now.plusSeconds(1),List.of(new ReceivingLine("RL1","OL2","P1","支","LOT1",n("8"),n("6"),n("2"),"")));
    assertEquals("failed",service.upload("one","receiving",rewired).state());
    assertEquals("OL1",service.required("one","receiving","RC1",Receiving.class).items().get(0).orderLineId());
    var twoLines=new Receiving("RC1","PO1","S1","W1","中心库",date,date,"approved",now.plusSeconds(1),List.of(new ReceivingLine("RL1","OL1","P1","支","LOT1",n("6"),n("6"),n("0"),""),new ReceivingLine("RL2","OL2","P1","支","LOT1",n("6"),n("6"),n("0"),"")));
    assertEquals("processed",service.upload("one","receiving",twoLines).state());
    service.upload("one","return",returned("RT1","2","completed",now));
    var changedInbound=new Inbound("IN1","RC1","W1","中心库",date,"completed","CNY",true,now.plusSeconds(1),List.of(new InboundLine("IL1","RL2","P1","支","B1","LOT1",date.minusYears(1),date.plusYears(1),n("6"),n("12"))));
    assertEquals("failed",service.upload("one","inbound",changedInbound).state());
    assertEquals("RL1",service.required("one","inbound","IN1",Inbound.class).items().get(0).receivingLineId());
  }
  @Test void completedReceiptsProtectOriginalPurchaseLineFromDeletion() {
    fulfillment();
    var changed=new OrderRequest("PO1","S1",date,"approved",n("20"),"CNY",true,now.plusSeconds(1),List.of(new OrderItem("changed-line","P1",n("10"),"支",n("2"),n("20"))));
    assertThrows(com.spd.mcp.api.common.BusinessException.class,()->service.validateOrderAmendment("one",changed));
  }
  @Test void inventorySnapshotReplacesBalanceIncludingAnEmptySnapshot() {
    var line=new StockLine("W1","中心库","P1","支","B1","LOT1",null,date.plusYears(1),n("6"),n("4"),n("0"),n("0"),n("0"),n("20"));
    var snapshot=new Inventory("CNY",true,"catalog_purchase_price",now,List.of(line));
    assertEquals("processed",service.upload("one","inventory",snapshot).state());
    assertEquals("processed",service.upload("one","inventory",new Inventory("CNY",true,"catalog_purchase_price",now.plusSeconds(1),List.of())).state());
    assertEquals(0,service.required("one","inventory","current",Inventory.class).items().size());
    assertEquals("ignored",service.upload("one","inventory",snapshot).state());
  }
  @Test void reportsUseMovementsForPurchasingAndBalancesForStock() {
    fulfillment();service.upload("one","return",returned("RT1","2","completed",now));
    var line=new StockLine("W1","中心库","P1","支","B1","LOT1",null,LocalDate.now().minusDays(1),n("6"),n("4"),n("0"),n("0"),n("0"),n("20"));
    service.upload("one","inventory",new Inventory("CNY",true,"catalog_purchase_price",now,List.of(line)));
    var reports=new Phase2ReportService(service,repo,new TenantContext(7),products);
    var result=reports.report("one",null,null,null,null,null,null);
    assertEquals(0,result.execution().get(0).remaining().compareTo(n("4")));
    assertEquals(0,result.amounts().get(0).netAmount().compareTo(n("8")));
    assertEquals(0,result.inventory().get(0).stock().availableQuantity().compareTo(n("10")));
    assertEquals("expired",result.inventory().get(0).expiryStatus());
    assertEquals(1,result.suppliers().get(0).orderCount());
    service.upload("one","return",returned("RT1","2","cancelled",now.plusSeconds(1)));
    assertEquals(0,reports.report("one",null,null,null,null,null,null).amounts().get(0).netAmount().compareTo(n("12")));
  }
  @Test void requestValidationRejectsNegativeInventoryBeforeSaving() {
    var line=new StockLine("W1","中心库","P1","支","B1",null,null,null,n("-1"),n("0"),n("0"),n("0"),n("0"),n("0"));
    try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
      assertFalse(factory.getValidator().validate(new Inventory("CNY",true,"catalog_purchase_price",now,List.of(line))).isEmpty());
    }
  }
}
