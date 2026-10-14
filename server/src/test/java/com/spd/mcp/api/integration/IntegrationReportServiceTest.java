package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.product.ProductRepository;
import com.spd.mcp.api.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

class IntegrationReportServiceTest {
  @Test void separatesUnitsCurrencyAndTaxWhileExcludingCancelledAndDraft() {
    var repo=mock(IntegrationRepository.class);var products=mock(ProductRepository.class);
    var mapper=new ObjectMapper().findAndRegisterModules();
    var service=new IntegrationReportService(repo,new TenantContext(1),products,mapper);
    var records=new ArrayList<StoredRecord>();
    records.add(record(mapper,"1","submitted","支","CNY",true));
    records.add(record(mapper,"2","submitted","盒","CNY",true));
    records.add(record(mapper,"3","submitted","支","USD",true));
    records.add(record(mapper,"4","submitted","支","CNY",false));
    records.add(record(mapper,"5","cancelled","支","CNY",true));
    records.add(record(mapper,"6","draft","支","CNY",true));
    when(repo.records(1,"one","order")).thenReturn(records);
    var result=service.report("one",null,null,null,null,null);
    assertEquals(4,result.orderCount());assertEquals(4,result.groups().size());assertEquals(4,result.prices().size());
    assertTrue(result.groups().stream().allMatch(g->g.amount().compareTo(new BigDecimal("9.99"))==0));
    assertTrue(result.prices().stream().allMatch(p->p.unitPrice().compareTo(new BigDecimal("5"))==0));
    assertEquals(0,service.report("one",LocalDate.of(2026,10,9),null,null,null,null).orderCount());
    assertEquals(0,service.report("one",null,null,"missing",null,null).orderCount());
  }
  private StoredRecord record(ObjectMapper mapper,String code,String state,String unit,String currency,boolean tax) {
    var item=new OrderItem("L1","P1",new BigDecimal("2"),unit,new BigDecimal("5"),new BigDecimal("9.99"));
    var order=new OrderRequest(code,"S1",LocalDate.of(2026,10,8),state,new BigDecimal("9.99"),currency,tax,Instant.parse("2026-10-08T00:00:00Z"),List.of(item));
    return new StoredRecord("one","order",code,order.sourceUpdatedAt().toString(),mapper.valueToTree(order));
  }
}
